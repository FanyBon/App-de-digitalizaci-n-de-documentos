import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../../config/db_controlcomidas';
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
    const metodo_pago_id = Number(saleData?.metodo_pago_id);

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
        conn = await getConnection();
        await conn.beginTransaction();

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
        let totalTax = 0;       // suma de impuestos por línea (para info/ajuste opcional)
        let totalSubsidy = 0;   // suma de subsidios por línea (fallback posible)
        const detallesProcesados: any[] = [];

        for (const rawItem of details) {
          // a) saneamiento mínimo del item
          const item = {
            producto_id: Number(rawItem.producto_id),
            cantidad: Number(rawItem.cantidad),
            precio_unitario: Number(rawItem.precio_unitario),
            ...rawItem
          };

          if (!Number.isFinite(item.producto_id) || !Number.isFinite(item.cantidad) || !Number.isFinite(item.precio_unitario)) {
            await conn.rollback();
            res.status(400).json({ error: 'Detalle incompleto o valores numéricos inválidos' });
            return;
          }

          // b) leer producto (inc_prodfin e impuesto por producto si existe)
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

          // c) determinar impuesto a usar: producto.impuesto_id or saleData.impuesto_id
          const impuestoIdAUsar = prod.impuesto_id ?? Number(saleData.impuesto_id);
          const [impRows]: any[] = await conn.query('SELECT porcentaje FROM impuestos WHERE id = ?', [impuestoIdAUsar]);
          if (!impRows.length) {
            await conn.rollback();
            res.status(400).json({ error: `Impuesto ${impuestoIdAUsar} no existe` });
            return;
          }
          const pct = Number(impRows[0].porcentaje);
          const tasa = pct / 100;

          // ---- Aquí aplicamos la regla solicitada (REEMPLAZAR AQUI) ----
          // netoUnitNoRedondeado = precio_unitario / (1 + tasa)
          // netoUnit = round2(netoUnitNoRedondeado)
          // impuestoPorUnidad = round2(precio_unitario - netoUnit)
          // impuestoLineaTotal = round2(impuestoPorUnidad * cantidad)


          // ---- FIN REEMPLAZO ----

          const cantidad = Number(item.cantidad);
          const precioUnitarioRecibido = Number(item.precio_unitario);

          if (!Number.isFinite(cantidad) || !Number.isFinite(precioUnitarioRecibido)) {
            await conn.rollback();
            res.status(400).json({ error: 'Detalle inválido: cantidad o precio_unitario no numérico' });
            return;
          }

          // neto por unidad no redondeado y redondeado (precio_unitario_neto por unidad)
          const netoUnitNoRedondeado = precioUnitarioRecibido / (1 + tasa);
          const netoUnit = Number(netoUnitNoRedondeado.toFixed(2)); // round2

          // impuesto por unidad (precio - netoUnit) redondeado
          const impuestoPorUnidad = Number((precioUnitarioRecibido - netoUnit).toFixed(2));

          // impuesto total de la línea (suma de unidades)
          const impuestoLineaTotal = Number((impuestoPorUnidad * cantidad).toFixed(2));

          // importe bruto total de la línea
          const importeBrutoLinea = Number((precioUnitarioRecibido * cantidad).toFixed(2));

          // acumular totales globales (usar impuestoLineaTotal)
          totalTax += impuestoLineaTotal;

          // --- Subsidio por producto (prioriza subsidio definido en producto) ---
          let subLineUnit = 0;       // subsidio por unidad que aplicará a este producto
          let subLineTotal = 0;      // subsidio total de la línea

          // Determinar id de subsidio a usar para este producto
          // `prod.aplica_subsidio` y `prod.subsidio_id` se obtienen en el SELECT de productos
          let subsidioIdProducto: number | null = null;
          if (prod.subsidio_id) {
            subsidioIdProducto = Number(prod.subsidio_id);
          } else if (prod.aplica_subsidio && saleData.subsidio_id != null) {
            subsidioIdProducto = Number(saleData.subsidio_id);
          }

          // Leer datos del subsidio si existe id
          let subProducto: any = null;
          if (subsidioIdProducto != null) {
            const [sRows]: any[] = await conn.query(
              'SELECT tipo, COALESCE(porcentaje,0) as porcentaje, COALESCE(monto_fijo,0) as monto_fijo FROM subsidios WHERE id = ? AND activo = 1',
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

          // Calcular subsidio por unidad según subProducto (si existe)
          if (subProducto) {
            if (String(subProducto.tipo) === 'porcentaje') {
              subLineUnit = Number((precioUnitarioRecibido * (subProducto.porcentaje / 100)).toFixed(2));
            } else {
              // subsidio fijo por unidad
              subLineUnit = Number(subProducto.monto_fijo.toFixed(2));
            }
          }
          subLineTotal = Number((subLineUnit * cantidad).toFixed(2));
          totalSubsidy += subLineTotal;

          // --- Crear N filas unitarias en detallesProcesados (cantidad = 1 por fila) ---
          for (let i = 0; i < cantidad; i++) {
            detallesProcesados.push({
              producto_id: item.producto_id,
              cantidad: 1,
              precio_unitario: Number(precioUnitarioRecibido.toFixed(2)), // por unidad (con IVA)
              precio_unitario_neto: netoUnit,                             // neto por unidad
              impuesto_id: impuestoIdAUsar,
              impuesto_porcentaje: pct,
              impuesto_monto: impuestoPorUnidad,                         // impuesto por unidad
              subsidio_aplicado: subLineUnit,                            // subsidio por unidad (0 si no aplica)
              importe_bruto: Number(precioUnitarioRecibido.toFixed(2)),
              neto_unitario: netoUnit
            });
          }



        }

        // 3) Ajuste por redondeo: comparar totalTax vs impuesto teórico desde total_venta
        const [tasaGlobalRows]: any[] = await conn.query('SELECT porcentaje FROM impuestos WHERE id = ?', [saleData.impuesto_id]);
        const tasaGlobal = tasaGlobalRows.length ? Number(tasaGlobalRows[0].porcentaje) / 100 : null;

        if (tasaGlobal != null) {
          const totalVentaNum = Number(saleData.total_venta);
          const impuestoTeorico = Number(((totalVentaNum - totalVentaNum / (1 + tasaGlobal)) + Number.EPSILON).toFixed(2));
          const diff = Number((impuestoTeorico - totalTax).toFixed(2));
          if (Math.abs(diff) >= 0.01 && detallesProcesados.length > 0) {
            // aplicar corrección simple al primer renglón
            detallesProcesados[0].impuesto_monto = Number((detallesProcesados[0].impuesto_monto + diff).toFixed(2));
            totalTax = Number((totalTax + diff).toFixed(2));
          }
        }

        // 4) Evitar NaN en totalSubsidy: fallback a saleData.subsidio_aplicado si provisto
        totalSubsidy = Number(totalSubsidy);
        if (!Number.isFinite(totalSubsidy)) totalSubsidy = 0;
        if ((!Number.isFinite(totalSubsidy) || totalSubsidy === 0) && Number.isFinite(Number(saleData.subsidio_aplicado))) {
          totalSubsidy = Number(saleData.subsidio_aplicado);
        }

        // 5) Saneamiento final y validación antes del INSERT del encabezado
        const totalVentaNum = Number(saleData.total_venta);
        totalTax = Number(totalTax);
        totalSubsidy = Number(totalSubsidy);

        if (!Number.isFinite(totalVentaNum) || !Number.isFinite(totalTax) || !Number.isFinite(totalSubsidy)) {
          console.error('Valores numéricos inválidos antes de INSERT ventas_pdv', {
            total_venta: saleData.total_venta,
            totalTax,
            totalSubsidy,
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

        // 6) Preparar parámetros del header e insertar en ventas_pdv (parámetros seguros)
        const headerParams = [
          Number(saleData.empleado_id),
          Number(saleData.usuario_id),
          totalVentaNum,
          totalSubsidy,
          saleData.tipo_venta,
          saleData.monedero_id ? Number(saleData.monedero_id) : null,
          Number(saleData.metodo_pago_id),
          Number(saleData.impuesto_id),
          totalTax,
          referencia
        ];

        const [saleRes]: any = await conn.query(
          `INSERT INTO ventas_pdv
             (fecha_hora, empleado_id, usuario_id,
              total_venta, subsidio_aplicado,
              tipo_venta, monedero_id, metodo_pago_id,
              impuesto_id, impuesto_monto,
              created_at, referencia)
           VALUES
             (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
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

          // 8) Registrar subsidio utilizado por línea si aplica
          if (d.subsidio_aplicado > 0) {
            await conn.query(
              `INSERT INTO subsidios_utilizados
              (empleado_id, fecha, monto_subsidio, created_at, venta_id, producto_id)
             VALUES (?, CURDATE(), ?, NOW(), ?, ?)`,
              [
                Number(saleData.empleado_id),
                d.subsidio_aplicado,
                ventaId,
                d.producto_id
              ]
            );
          }
        } // end for detallesProcesados

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

        // Respuesta final (success)
        res.status(201).json({
          message: 'Transacción exitosa',
          venta_id: ventaId,
          referencia
        });
        return;
      } catch (err: any) {
        // Rollback y reintento en caso de deadlock
        if (conn) {
          await conn.rollback().catch((e: any) => console.error('Rollback falló:', e));
        }
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
