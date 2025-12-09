import { Request, Response, NextFunction } from 'express';
import { getPool } from '../../config/db_controlcomidas';
import { Transaccion } from '../../models/ventas/Transacciones';

// Procesa una transacción de venta maestro-detalle
export const procesarTransaccion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const MAX_RETRIES = 3;
  let attempts = 0;
  let conn: any = null;

  try {
    // Desestructuramos payload
    const { saleData, details } = req.body;
    // Helper de normalización para IDs y números
    const toNullableId = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const num = Number(v);
      return Number.isFinite(num) && num > 0 ? num : null;
    };
    const toNumberSafe = (v: unknown, fallback = 0): number => Number.isFinite(Number(v)) ? Number(v) : fallback;

    // Normalizaciones iniciales (usar estas variables en todo el handler)
    const empleadoId = toNullableId(saleData.empleado_id);
    const subsidioIdGlobal = toNullableId(saleData.subsidio_id);
    const usuarioId = toNullableId((req as any).user?.id ?? saleData.usuario_id ?? saleData.created_by);
    const metodoPagoIdRaw = toNullableId(saleData.metodo_pago_id);
    const monederoIdRaw = toNullableId(saleData.monedero_id);

    // Log inicial para diagnóstico
    console.log('INCOMING saleData raw', JSON.stringify(saleData));
    console.log('NORMALIZED START', { empleadoId, subsidioIdGlobal, usuarioId, metodoPagoIdRaw, monederoIdRaw });

    const metodo_pago_id = metodoPagoIdRaw; // number|null



    // --- Resolver método de pago desde BD (fuente de la verdad)
    const connTmpForMetodo = await getPool().getConnection();
    const [mpRowsTmp]: any[] = await connTmpForMetodo.query(
      'SELECT id, codigo, requiere_validacion FROM metodos_pago WHERE id = ? LIMIT 1',
      [metodo_pago_id]
    );
    connTmpForMetodo.release && connTmpForMetodo.release();
    if (!mpRowsTmp || !mpRowsTmp.length) {
      res.status(400).json({ error: 'invalid_metodo_pago_id' });
      return;
    }
    const resolvedMetodo = mpRowsTmp[0];
    const requiresNip = Number(resolvedMetodo.requiere_validacion) === 1;
    console.log('Resolved metodo_pago_id=', metodo_pago_id, 'codigo=', resolvedMetodo.codigo, 'requiresNip=', requiresNip);
    // guardar en req para uso posterior si quieres
    (req as any).resolvedMetodoPago = resolvedMetodo;


    // Validación básica previa
    if (
      !saleData ||
      !details ||
      !Array.isArray(details) ||
      (!('impuesto_id' in saleData) || !Number.isFinite(Number(saleData.impuesto_id)))
    ) {
      res.status(400).json({
        error: 'Debe incluir saleData con impuesto_id válido y array details'
      });
      return;
    }

    // BLOQUE 1: reservar idempotency
    const idempotencyKey = (req.header('X-Idempotency-Key') || null) as string | null;
    if (!idempotencyKey) { res.status(400).json({ error: 'X-Idempotency-Key required' }); return; }
    try {
      const connReserve = await getPool().getConnection();
      const expiresAtReserve = new Date(Date.now() + (Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? 86400) * 1000));
      await connReserve.query(
        `INSERT INTO idempotency_keys (key_id, created_at, expires_at, status, user_ident)
     VALUES (?, NOW(), ?, 'reserved', ?)`,
        [idempotencyKey, expiresAtReserve, (req as any).user?.id ?? null]
      );
      connReserve.release && connReserve.release();
    } catch (errReserve) {
      const connCheck = await getPool().getConnection();
      const [existing]: any[] = await connCheck.query(`SELECT status, result FROM idempotency_keys WHERE key_id = ? LIMIT 1`, [idempotencyKey]);
      connCheck.release && connCheck.release();
      if (existing && existing.length) {
        const row = existing[0];
        if (row.status === 'done' && row.result) { res.status(200).json(JSON.parse(row.result)); return; }
        res.status(409).json({ error: 'idempotency_in_progress' }); return;
      }
      res.status(500).json({ error: 'idempotency_reservation_failed' }); return;
    }


    // Aceptamos total_venta opcional: si no viene o no es numérico lo calculamos desde details
    let totalVentaNum: number = Number(saleData.total_venta);
    if (!Number.isFinite(totalVentaNum)) {
      totalVentaNum = 0;
      for (const it of details) {
        const q = Number(it.cantidad);
        const pu = Number(it.precio_unitario);
        if (!Number.isFinite(q) || !Number.isFinite(pu)) {
          res.status(400).json({ error: 'Cada detalle debe tener cantidad y precio_unitario numéricos' });
          return;
        }
        totalVentaNum += q * pu;
      }
      // redondeo final
      totalVentaNum = Number(totalVentaNum.toFixed(2));
      // inyectamos para consistencia en el resto del flujo
      saleData.total_venta = totalVentaNum;
    } else {
      // normalizar y redondear
      totalVentaNum = Number(totalVentaNum.toFixed(2));
      saleData.total_venta = totalVentaNum;
    }


    // Generar referencia (única por intento)
    let referencia = `${Transaccion.generarReferenciaNumerica()}-MP${metodo_pago_id}`;

    while (attempts < MAX_RETRIES) {
      try {
        conn = await getPool().getConnection();
        await conn.beginTransaction();

        // BLOQUE 2: consumir nip_token sólo si el método requiere validación
        if (requiresNip) {
          const nipToken = req.body.nip_validation_token ?? null;
          if (!nipToken) {
            await conn.rollback();
            await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
            res.status(400).json({ error: 'missing_nip_token' });
            return;
          }

          const [tokenRows]: any[] = await conn.query(
            `SELECT token, empleado_id, monedero_id, expires_at, consumed_at
     FROM nip_tokens WHERE token = ? FOR UPDATE`,
            [nipToken]
          );

          if (!tokenRows.length) {
            await conn.rollback();
            await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
            res.status(401).json({ error: 'invalid_or_expired_token' });
            return;
          }

          const tokenRow = tokenRows[0];
          if (tokenRow.consumed_at) {
            await conn.rollback();
            await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
            res.status(401).json({ error: 'token_already_consumed' });
            return;
          }

          if (new Date(tokenRow.expires_at) < new Date()) {
            await conn.rollback();
            await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
            res.status(401).json({ error: 'token_expired' });
            return;
          }

          if (empleadoId !== null && Number(tokenRow.empleado_id) !== Number(empleadoId)) {
            await conn.rollback();
            await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
            res.status(403).json({ error: 'token_employee_mismatch' });
            return;
          }

          await conn.query(
            `UPDATE nip_tokens SET consumed_at = NOW(), consumed_by_ip = ? WHERE token = ?`,
            [req.ip ?? null, nipToken]
          );
        } else {
          // No requiere NIP: trazabilidad en staging
          console.log('Metodo payment no requiere NIP, omitiendo consumo de nip_tokens', { metodo_pago_id, resolvedMetodo: (req as any).resolvedMetodoPago });
        }


        // 1) Leer datos de subsidio si viene subsidio_id (sanea con COALESCE)
        let sub: any = { tipo: null, porcentaje: 0, monto_fijo: 0 };
        if (saleData.subsidio_id != null) {
          const [subRows]: any[] = await conn.query(
            'SELECT tipo, COALESCE(porcentaje,0) as porcentaje, COALESCE(monto_fijo,0) as monto_fijo FROM subsidios WHERE id = ? AND activo = 1',
            [Number(saleData.subsidio_id)]
          );
          if (!subRows.length) {
            await conn.rollback();
            res.status(400).json({ error: 'Subsidio no válido' });
            return;
          }
          sub = subRows[0];
          sub.porcentaje = Number(sub.porcentaje);
          sub.monto_fijo = Number(sub.monto_fijo);
        }

        // 2) Iterar detalles y calcular por línea (neto por unidad y impuesto por línea)
        let totalTax = 0;
        let totalSubsidyCandidate = 0; // suma potencial antes de aplicar cupo/derecho
        let appliedSubsidyTotal = 0;   // suma real que sí se aplicará y se guardará en ventas_pdv
        const detallesProcesados: any[] = [];

        // --- Preparación global para control de subsidios (normalizado, evita NaN en SQL) ---
        // --- Preparación global para control de subsidios (normalizado, evita NaN en SQL) ---


        // Obtener empleado solo si empleadoId es válido (> 0)
        let empleadoRow: any = null;
        if (empleadoId !== null && Number.isFinite(empleadoId) && empleadoId > 0) {
          const [empRowsInit]: any[] = await conn.query(
            'SELECT id, aplica_subsidio, max_asistencias_por_dia FROM empleados WHERE id = ? LIMIT 1',
            [empleadoId]
          );
          empleadoRow = empRowsInit.length ? empRowsInit[0] : null;
        } else {
          console.log('No empleado válido recibido, omitiendo consultas de empleado/subsidio', { empleadoRaw: saleData.empleado_id });
        }
        const aplicaGeneral = Boolean(empleadoRow && Number(empleadoRow.aplica_subsidio) === 1);

        // Calcular usedToday solo si empleadoId válido
        let usedToday = 0;
        if (empleadoId !== null && Number.isFinite(empleadoId) && empleadoId > 0) {
          const [usedRowsInit]: any[] = await conn.query(
            `SELECT COUNT(*) AS used_today FROM subsidios_utilizados WHERE empleado_id = ? AND DATE(created_at) = CURDATE()`,
            [empleadoId]
          );
          usedToday = usedRowsInit.length ? Number(usedRowsInit[0].used_today) : 0;
        }

        const cupoDiario = Number.isFinite(Number(saleData.cupo_diario))
          ? Number(saleData.cupo_diario)
          : Number.isFinite(Number(empleadoRow?.max_asistencias_por_dia))
            ? Number(empleadoRow.max_asistencias_por_dia)
            : 0;


        // Límite de expansión por unidad para evitar DoS/timeout
        const MAX_UNIT_EXPANSION = Number(process.env.MAX_UNIT_EXPANSION ?? 200);
        if (!Number.isFinite(MAX_UNIT_EXPANSION) || MAX_UNIT_EXPANSION <= 0) {
          // fallback razonable
          // (no detener, solo asegurar valor)
        }

        // Log de diagnóstico en staging
        console.log('SUBSIDY PREP', { empleadoId, aplicaGeneral, usedToday, cupoDiario, subsidioIdGlobal, MAX_UNIT_EXPANSION });


        // --- Procesar cada detalle ---
        for (const rawItem of details) {
          const item = {
            producto_id: Number(rawItem.producto_id),
            cantidad: Number(rawItem.cantidad),
            precio_unitario: Number(rawItem.precio_unitario),
            ...rawItem
          };

          // normalizar cantidad y validar límite de expansión por unidad
          const cantidad = Number(item.cantidad);
          if (!Number.isFinite(cantidad) || cantidad <= 0) {
            await conn.rollback();
            res.status(400).json({ error: 'cantidad inválida' });
            return;
          }
          const MAX_UNIT_EXPANSION = Number(process.env.MAX_UNIT_EXPANSION ?? 200);
          if (cantidad > MAX_UNIT_EXPANSION) {
            await conn.rollback();
            res.status(400).json({ error: 'cantidad_excede_limite_para_procesamiento' });
            return;
          }


          // leer producto
          const [prodRows]: any[] = await conn.query(
            'SELECT impuesto_id, inc_prodfin, aplica_subsidio, subsidio_id FROM productos WHERE id = ?',
            [item.producto_id]
          );
          if (!prodRows.length) {
            await conn.rollback();
            res.status(400).json({ error: `Producto ${item.producto_id} no existe` });
            return;
          }
          const prod = prodRows[0];
          prod.inc_prodfin = Number(prod.inc_prodfin);

          // impuesto
          const impuestoIdAUsar = prod.impuesto_id ?? Number(saleData.impuesto_id);
          const [impRows]: any[] = await conn.query('SELECT porcentaje FROM impuestos WHERE id = ?', [impuestoIdAUsar]);
          if (!impRows.length) {
            await conn.rollback();
            res.status(400).json({ error: `Impuesto ${impuestoIdAUsar} no existe` });
            return;
          }
          const pct = Number(impRows[0].porcentaje);
          const tasa = pct / 100;


          const precioUnitarioRecibido = Number(item.precio_unitario);

          // cálculos unitarios: neto por unidad redondeado, impuesto por unidad, impuesto línea total
          const netoUnitNoRedondeado = precioUnitarioRecibido / (1 + tasa);
          const netoUnit = Number(netoUnitNoRedondeado.toFixed(2));
          const impuestoPorUnidad = Number((precioUnitarioRecibido - netoUnit).toFixed(2));
          const impuestoLineaTotal = Number((impuestoPorUnidad * cantidad).toFixed(2));
          const importeBrutoLinea = Number((precioUnitarioRecibido * cantidad).toFixed(2));

          totalTax += impuestoLineaTotal;

          // --- Subsidio por producto (prioriza subsidio definido en producto) ---
          let subLineUnit = 0;       // subsidio por unidad que aplicará a este producto (potencial)
          let subLineTotal = 0;      // subsidio total potencial de la línea

          // Determinar id de subsidio a usar para este producto
          let subsidioIdProducto: number | null = null;
          if (prod.subsidio_id) {
            subsidioIdProducto = Number(prod.subsidio_id);
          } else if (prod.aplica_subsidio && saleData.subsidio_id != null) {
            subsidioIdProducto = Number(saleData.subsidio_id);
          } else if (saleData.subsidio_id) {
            subsidioIdProducto = Number(saleData.subsidio_id);
          }

          // Leer datos del subsidio si existe id
          let subProducto: any = null;
          if (subsidioIdProducto != null) {
            const [sRows]: any[] = await conn.query(
              'SELECT id, tipo, COALESCE(porcentaje,0) as porcentaje, COALESCE(monto_fijo,0) as monto_fijo FROM subsidios WHERE id = ? AND activo = 1',
              [subsidioIdProducto]
            );
            if (sRows.length) {
              subProducto = sRows[0];
              subProducto.porcentaje = Number(subProducto.porcentaje);
              subProducto.monto_fijo = Number(subProducto.monto_fijo);
            } else {
              subProducto = null; // subsidio referenciado inválido -> no aplicar
            }
          }

          // Calcular subsidio potencial por unidad según subProducto (si existe)
          if (subProducto) {
            if (String(subProducto.tipo) === 'porcentaje') {
              subLineUnit = Number((precioUnitarioRecibido * (subProducto.porcentaje / 100)).toFixed(2));
            } else {
              subLineUnit = Number(subProducto.monto_fijo.toFixed(2));
            }
          }
          subLineTotal = Number((subLineUnit * cantidad).toFixed(2));
          totalSubsidyCandidate += subLineTotal;

          // --- Crear N filas unitarias en detallesProcesados (cantidad = 1 por fila) ---
          for (let i = 0; i < cantidad; i++) {
            // decidir por unidad si aplicar subsidio, respetando cupo y derecho
            let subsidioAplicableUnit = 0;

            if (!aplicaGeneral || cupoDiario <= 0) {
              // no tiene derecho o cupo 0: no aplicar
              subsidioAplicableUnit = 0;
            } else if (usedToday >= cupoDiario) {
              // ya agotó cupo para hoy
              subsidioAplicableUnit = 0;
            } else if (subLineUnit <= 0) {
              // producto no tiene subsidio definido
              subsidioAplicableUnit = 0;
            } else {
              // aplicar subsidio para esta unidad
              subsidioAplicableUnit = Number(subLineUnit);
              usedToday += 1;              // consumir cupo en memoria
              appliedSubsidyTotal += subsidioAplicableUnit; // acumular lo que realmente se aplicará
            }

            detallesProcesados.push({
              producto_id: item.producto_id,
              cantidad: 1,
              precio_unitario: Number(precioUnitarioRecibido.toFixed(2)), // por unidad (con IVA)
              precio_unitario_neto: netoUnit,                             // neto por unidad
              impuesto_id: impuestoIdAUsar,
              impuesto_porcentaje: pct,
              impuesto_monto: impuestoPorUnidad,                         // impuesto por unidad
              subsidio_aplicado: subsidioAplicableUnit,                  // subsidio por unidad (0 si no aplica)
              importe_bruto: Number(precioUnitarioRecibido.toFixed(2)),
              neto_unitario: netoUnit
            });
          }
        }


        // 3) Ajuste por redondeo: comparar totalTax vs impuesto teórico desde total_venta
        // Declarar totalVentaNum una sola vez antes de usarlo
        const totalVentaNum = Number(saleData.total_venta);
        if (!Number.isFinite(totalVentaNum)) {
          console.error('total_venta inválido', { total_venta: saleData.total_venta });
          await conn.rollback();
          res.status(400).json({ error: 'total_venta inválido' });
          return;
        }

        const [tasaGlobalRows]: any[] = await conn.query('SELECT porcentaje FROM impuestos WHERE id = ?', [saleData.impuesto_id]);
        const tasaGlobal = tasaGlobalRows.length ? Number(tasaGlobalRows[0].porcentaje) / 100 : null;

        if (tasaGlobal != null) {
          const impuestoTeorico = Number(((totalVentaNum - totalVentaNum / (1 + tasaGlobal)) + Number.EPSILON).toFixed(2));
          let diff = Number((impuestoTeorico - totalTax).toFixed(2));

          if (Math.abs(diff) >= 0.01 && detallesProcesados.length > 0) {
            const idxs = detallesProcesados
              .map((d, i) => ({ i, impuesto: Number(d.impuesto_monto) || 0 }))
              .filter(x => x.impuesto > 0)
              .map(x => x.i);

            if (idxs.length === 0) {
              const last = detallesProcesados.length - 1;
              detallesProcesados[last].impuesto_monto = Number((Number(detallesProcesados[last].impuesto_monto || 0) + diff).toFixed(2));
              totalTax = Number((totalTax + diff).toFixed(2));
            } else {
              const impuestosTotales = idxs.reduce((acc, idx) => acc + Number(detallesProcesados[idx].impuesto_monto || 0), 0);
              let restante = diff;

              for (let j = 0; j < idxs.length; j++) {
                const idx = idxs[j];
                const prop = impuestosTotales > 0 ? Number(detallesProcesados[idx].impuesto_monto || 0) / impuestosTotales : 1 / idxs.length;
                const ajuste = j === idxs.length - 1 ? restante : Number((diff * prop).toFixed(2));
                const nuevo = Number((Number(detallesProcesados[idx].impuesto_monto || 0) + ajuste).toFixed(2));

                if (nuevo < 0) {
                  const ajusteReal = -Number(detallesProcesados[idx].impuesto_monto || 0);
                  detallesProcesados[idx].impuesto_monto = 0;
                  restante = Number((restante - ajusteReal).toFixed(2));
                } else {
                  detallesProcesados[idx].impuesto_monto = nuevo;
                  restante = Number((restante - ajuste).toFixed(2));
                }
              }

              totalTax = Number((totalTax + diff - restante).toFixed(2));

              if (Math.abs(restante) >= 0.01) {
                const lastIdx = idxs[idxs.length - 1];
                detallesProcesados[lastIdx].impuesto_monto = Number((Number(detallesProcesados[lastIdx].impuesto_monto || 0) + restante).toFixed(2));
                totalTax = Number((totalTax + restante).toFixed(2));
              }
            }
          }
        }



        // --- 4) Evitar NaN en appliedSubsidyTotal: fallback a saleData.subsidio_aplicado si provisto
        let totalSubsidyFinal = Number(appliedSubsidyTotal);
        if (!Number.isFinite(totalSubsidyFinal)) totalSubsidyFinal = 0;
        if ((totalSubsidyFinal === 0 || !Number.isFinite(totalSubsidyFinal)) && Number.isFinite(Number(saleData.subsidio_aplicado))) {
          totalSubsidyFinal = Number(saleData.subsidio_aplicado);
        }

        // --- 5) Saneamiento final y validación antes del INSERT del encabezado
        totalTax = Number(totalTax);
        totalSubsidyFinal = Number(totalSubsidyFinal);

        // Asegura que totalVentaNum ya fue declarado (Bloque 3). Si no, declarar:
        // const totalVentaNum = Number(saleData.total_venta);

        if (!Number.isFinite(totalVentaNum) || !Number.isFinite(totalTax) || !Number.isFinite(totalSubsidyFinal)) {
          console.error('Valores numéricos inválidos antes de INSERT ventas_pdv', {
            total_venta: saleData.total_venta,
            totalTax,
            totalSubsidyFinal,
            detallesProcesados
          });
          await conn.rollback();
          res.status(400).json({ error: 'Valores numéricos inválidos en transacción' });
          return;
        }

        // validar cada detalle final convertido
        for (const d of detallesProcesados) {
          d.producto_id = Number(d.producto_id);
          d.cantidad = Number(d.cantidad);
          d.precio_unitario = Number(d.precio_unitario);
          d.impuesto_monto = Number(d.impuesto_monto);
          d.subsidio_aplicado = Number(d.subsidio_aplicado);

          if (
            !Number.isFinite(d.producto_id) ||
            !Number.isFinite(d.cantidad) ||
            !Number.isFinite(d.precio_unitario) ||
            !Number.isFinite(d.impuesto_monto) ||
            !Number.isFinite(d.subsidio_aplicado)
          ) {
            console.error('Detalle con valores no numéricos', d);
            await conn.rollback();
            res.status(400).json({ error: 'Detalle contiene valores numéricos inválidos' });
            return;
          }
        }

        // --- 6) Preparar parámetros del header e insertar en ventas_pdv (parámetros seguros)

        // Recalcular la suma real de subsidios aplicados a partir de los renglones finales
        const totalSubsidyReal = detallesProcesados.reduce((acc, d) => {
          const v = Number.isFinite(Number(d.subsidio_aplicado)) ? Number(d.subsidio_aplicado) : 0;
          return acc + v;
        }, 0);

        const subsidioRowsToInsert = detallesProcesados.filter(d => {
          const v = Number.isFinite(Number(d.subsidio_aplicado)) ? Number(d.subsidio_aplicado) : 0;
          return v > 0;
        });


        // Asegurar número y evitar fallbacks que sobreescriban
        let totalSubsidyForHeader = Number(totalSubsidyReal);
        if (!Number.isFinite(totalSubsidyForHeader) || totalSubsidyForHeader <= 0) {
          totalSubsidyForHeader = 0;
        }

        // logging TEMPORAL para validar en pruebas (elimina en producción)
        console.log('detallesProcesados subsidios:', detallesProcesados.map(d => d.subsidio_aplicado));
        console.log('totalSubsidyForHeader (guardado en ventas_pdv):', totalSubsidyForHeader);

        // Validaciones finales antes de insertar (asegura totalVentaNum y totalTax estén definidos)
        if (!Number.isFinite(totalVentaNum)) {
          console.error('totalVentaNum inválido antes de INSERT ventas_pdv', { total_venta: saleData.total_venta });
          await conn.rollback();
          res.status(400).json({ error: 'total_venta inválido' });
          return;
        }
        if (!Number.isFinite(totalTax)) {
          console.error('totalTax inválido antes de INSERT ventas_pdv', { totalTax });
          await conn.rollback();
          res.status(400).json({ error: 'totalTax inválido' });
          return;
        }

        // Reglas de negocio condicionales (antes de preparar headerParams)
        // Ajusta ID_MONEDERO y requiereEmpleado según tu negocio
        const ID_MONEDERO = Number(process.env.ID_MONEDERO ?? 4);
        const requiereEmpleado = false; // o la condición: saleData.tipo_venta === 'pdv'

        if (metodoPagoIdRaw === ID_MONEDERO && monederoIdRaw === null) {
          await conn.rollback();
          await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
          res.status(400).json({ error: 'missing_monedero_id_for_monedero_payment' });
          return;
        }

        if (requiereEmpleado && empleadoId === null) {
          await conn.rollback();
          await conn.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
          res.status(400).json({ error: 'missing_empleado_id' });
          return;
        }




        // Si decides que empleado es condicional (por ejemplo solo para tipo_venta === 'pdv'), usa:
        // const requiereEmpleado = saleData.tipo_venta === 'pdv';
        // if (requiereEmpleado && !Number.isFinite(Number(saleData.empleado_id))) { ... }
        const empleadoIdForInsert = empleadoId; // null o number
        const usuarioIdForInsert = usuarioId;  // null o number
        const monederoIdForInsert = monederoIdRaw;
        const metodoPagoIdForInsert = metodoPagoIdRaw;
        const impuestoIdForInsert = toNullableId(saleData.impuesto_id);

        const totalVentaForInsert = toNumberSafe(totalVentaNum, 0);
        const impuestoMontoForInsert = toNumberSafe(totalTax, 0);
        const subsidioForInsert = toNumberSafe(totalSubsidyForHeader, 0);

        // ✅ DESPUÉS: Agregar punto_venta_id y punto_venta_codigo
        const puntoVentaId = toNullableId(saleData.punto_venta_id);
        const puntoVentaCodigo = saleData.punto_venta_codigo ?? null;

        const headerParams = [
          empleadoIdForInsert,
          usuarioIdForInsert,
          totalVentaForInsert,
          subsidioForInsert,
          saleData.tipo_venta,
          monederoIdForInsert,
          metodoPagoIdForInsert,
          impuestoIdForInsert,
          impuestoMontoForInsert,
          puntoVentaId,          // ✅ NUEVO
          puntoVentaCodigo,      // ✅ NUEVO
          referencia
        ];

        console.log('HEADER PARAMS FOR INSERT', { headerParams });





        const [saleRes]: any = await conn.query(
          `INSERT INTO ventas_pdv
   (fecha_hora, empleado_id, usuario_id,
    total_venta, subsidio_aplicado,
    tipo_venta, monedero_id, metodo_pago_id,
    impuesto_id, impuesto_monto,
    punto_venta_id, punto_venta_codigo,
    created_at, referencia)
 VALUES
   (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          headerParams
        );

        const ventaId = saleRes.insertId;


        // 7) Insertar cada detalle en detalle_venta y registrar subsidios_utilizados
        for (const d of detallesProcesados) {
          await conn.query(
            `INSERT INTO detalle_venta
              (venta_id, producto_id, cantidad,
               precio_unitario, precio_unitario_neto, subsidio_aplicado,
               metodo_pago_id,
               impuesto_id, impuesto_porcentaje, impuesto_monto,
               created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              ventaId,
              d.producto_id,
              d.cantidad,
              d.precio_unitario,
              d.precio_unitario_neto,
              d.subsidio_aplicado,
              Number(saleData.metodo_pago_id),
              d.impuesto_id,
              d.impuesto_porcentaje,
              d.impuesto_monto
            ]
          );

          console.log('Entrando a Bloque 8: insertar subsidios_utilizados. ventaId:', ventaId);
          console.trace();
          console.log('detallesProcesados.length', detallesProcesados.length);


          // --- 8) Insertar en subsidios_utilizados solo por cada renglón unitario con subsidio_aplicado > 0 ---
          // Guard en memoria para asegurar una única ejecución por proceso/llamada
          if (!(req as any)._subsidios_insertados_guard) {
            (req as any)._subsidios_insertados_guard = true;

            try {
              // Comprueba si ya hay registros para esta venta (idempotencia en DB)
              const [existingRows]: any[] = await conn.query(
                'SELECT COUNT(*) AS cnt FROM subsidios_utilizados WHERE venta_id = ?',
                [ventaId]
              );
              const already = existingRows.length ? Number(existingRows[0].cnt) : 0;
              console.log('SUBSIDIOS ya registrados para ventaId', ventaId, 'count=', already);

              if (already > 0) {
                console.log('Saltando inserciones en subsidios_utilizados porque ya existen filas para esta venta.');
              } else {
                const subsidioRowsToInsert = detallesProcesados.filter(d => Number(d.subsidio_aplicado ?? 0) > 0);
                console.log('SUBSIDIOS A INSERTAR count:', subsidioRowsToInsert.length);
                for (const d of subsidioRowsToInsert) {
                  await conn.query(
                    `INSERT INTO subsidios_utilizados
             (empleado_id, cantidad, fecha, monto_subsidio, monto_total_subsidio,
              usuario_id, observaciones, created_by, created_at, venta_id, producto_id)
           VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, NOW(), ?, ?)`,
                    [
                      Number(saleData.empleado_id),
                      1,
                      Number(d.subsidio_aplicado),
                      Number(d.subsidio_aplicado),
                      Number((req as any).user?.id ?? saleData.usuario_id ?? saleData.created_by ?? 0),
                      null,
                      Number((req as any).user?.id ?? saleData.usuario_id ?? saleData.created_by ?? 0),
                      ventaId,
                      Number(d.producto_id)
                    ]
                  );
                }
                console.log('Inserciones en subsidios_utilizados completadas para ventaId', ventaId);
              }
            } catch (err: any) {
              const errMsg = err && (err.message || err.sqlMessage) ? (err.message || err.sqlMessage) : String(err);
              console.error('ERROR insert subsidios_utilizados', { ventaId, err: errMsg, rawError: err });
              await conn.rollback();
              res.status(500).json({ error: 'Error en insertar subsidios_utilizados', detail: errMsg });
              return;
            }
          } else {
            console.log('Bloque 8 ya se ejecutó en esta request (guard activo).');
          }
        }

        // 9) Actualizar monedero con total_venta (ya saneado)
        if (saleData.monedero_id) {
          await conn.query(
            `UPDATE monederos
       SET saldo_actual = saldo_actual - ?
     WHERE id = ?`,
            [totalVentaNum, Number(saleData.monedero_id)]
          );
        }

        await conn.commit();

        // BLOQUE E: commit ya hecho antes -> construir resultado, marcar idempotency y RESPONDER UNA SOLA VEZ
        const ventaResult = {
          ok: true,
          venta_id: ventaId,
          referencia,
          total_venta: totalVentaNum,   // usa la variable que ya tienes en scope
          impuesto_monto: totalTax,
          subsidio_aplicado: totalSubsidyForHeader
        };

        await conn.query(
          `UPDATE idempotency_keys SET status = 'done', result = ? WHERE key_id = ?`,
          [JSON.stringify(ventaResult), idempotencyKey]
        );

        // RESPONDER solo aquí, eliminar cualquier otro res.status(201) duplicado más abajo
        res.status(201).json(ventaResult);
        return;


      } catch (err: any) {
        // Rollback y manejo del error
        if (conn) {
          await conn.rollback().catch((e: any) => console.error('Rollback falló:', e));
        }

        // CLEANUP IDP: eliminar reserva idempotency tras fallo (evita reservas eternas)
        try {
          const connCleanup = await getPool().getConnection();
          await connCleanup.query('DELETE FROM idempotency_keys WHERE key_id = ?', [idempotencyKey]);
          connCleanup.release && connCleanup.release();
        } catch (cleanupErr) {
          console.error('Error limpiando idempotency after failure', cleanupErr);
        }

        // Reintento por deadlock (mantener tu lógica)
        if (err && err.code === 'ER_LOCK_DEADLOCK' && attempts < MAX_RETRIES - 1) {
          attempts++;
          await new Promise(r => setTimeout(r, attempts * 100));
          continue;
        }

        console.error('Error procesarTransaccion:', err);
        res.status(500).json({ error: err.message || 'Error en transacción' });
        return;
      } finally {

        if (conn) {
          try { conn.release && conn.release(); } catch (e) { console.error('Release falló', e); }
        }
      }
    } // end while
  } catch (outerErr) {
    console.error('Error inesperado en procesarTransaccion:', outerErr);
    next(outerErr);
    return;
  }
}




// Listar transacciones
export const listarTransacciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transacciones = await Transaccion.listar();
    res.status(200).json(transacciones);
  } catch (error) {
    console.error('Error en listarTransacciones:', error);
    next(error);
  }
};

// Obtener transacción por ID
export const obtenerTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const transaccion = await Transaccion.obtenerPorId(Number(id));
    if (!transaccion) {
      res.status(404).json({ error: 'Transacción no encontrada' });
      return;
    }
    res.status(200).json(transaccion);
  } catch (error) {
    console.error('Error en obtenerTransaccion:', error);
    next(error);
  }
};

// Buscar transacciones por referencia, empleado o fecha
export const buscarTransacciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === "") {
      res.status(400).json({ error: "El parámetro 'q' es obligatorio y debe ser un string válido" });
      return;
    }
    const transacciones = await Transaccion.buscar(q);
    if (transacciones.length === 0) {
      res.status(404).json({ message: "No se encontraron transacciones con el término proporcionado" });
      return;
    }
    res.status(200).json(transacciones);
  } catch (error) {
    console.error("Error en buscarTransacciones:", error);
    next(error);
  }
};

// Editar una transacción
export const editarTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Transaccion.editar(Number(req.params.id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error en editarTransaccion:', error);
    next(error);
  }
};

// Eliminar una transacción
export const eliminarTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Transaccion.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarTransaccion:', error);
    next(error);
  }
};
