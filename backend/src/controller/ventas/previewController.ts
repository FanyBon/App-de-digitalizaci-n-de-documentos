import { Request, Response } from 'express';
import { getPool } from '../../config/db_controlcomidas';

type LineaInput = {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  aplica_subsidio?: boolean;
  subsidio_por_unidad?: number;
};

async function calcularPreview(conn: any, empleadoId: number | null, monederoId: number | null, lineas: LineaInput[]) {
  let totalBruto = 0;
  const subsidioPorProducto: any[] = [];

  // 1) Empleado
  let empleado: any = null;
  if (empleadoId) {
    const [empRows]: any[] = await conn.query(
      'SELECT id, nombre, aplica_subsidio, empresa_id, id_ubicacion_empleado, max_asistencias_por_dia, monedero_id FROM empleados WHERE id = ? LIMIT 1',
      [empleadoId]
    );
    if (empRows.length) empleado = empRows[0];
  }

  // 2) Saldo del monedero
  let saldoMonedero = 0;
  if (monederoId) {
    try {
      const [mRows]: any[] = await conn.query('SELECT id, saldo_actual FROM monederos WHERE id = ? LIMIT 1', [monederoId]);
      if (mRows.length) saldoMonedero = Number(mRows[0].saldo_actual ?? 0);
    } catch (err) {
      console.warn('previewVenta: error leyendo monedero', (err as any)?.message ?? err);
      saldoMonedero = 0;
    }
  }

  // 3) Reglas de subsidio globales (si existen)
  let regla: { monto_diario: number; unidades_diarias: number; rules_version?: string } = {
    monto_diario: 0,
    unidades_diarias: 0,
    rules_version: 'none'
  };
  try {
    if (empleado?.empresa_id || empleado?.id_ubicacion_empleado) {
      const [ruleRows]: any[] = await conn.query(
        `SELECT monto_diario, unidades_diarias, version AS rules_version
         FROM subsidio_reglas
         WHERE empresa_id = ? OR ubicacion_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [empleado?.empresa_id ?? null, empleado?.id_ubicacion_empleado ?? null]
      );
      if (ruleRows.length) {
        regla.monto_diario = Number(ruleRows[0].monto_diario || 0);
        regla.unidades_diarias = Number(ruleRows[0].unidades_diarias || 0);
        regla.rules_version = ruleRows[0].rules_version ?? 'v1';
      }
    }
  } catch (err) {
    console.warn('previewVenta: error leyendo reglas de subsidio', (err as any)?.message ?? err);
  }

  // 4) Si regla no define unidades, usar max_asistencias_por_dia del empleado
  if ((!regla.unidades_diarias || regla.unidades_diarias <= 0) && empleado?.max_asistencias_por_dia) {
    regla.unidades_diarias = Number(empleado.max_asistencias_por_dia || 0);
  }

  // 5) Consumo del día del empleado
  // Reemplaza la sección "5) Consumo del día del empleado" por esto
let used_amount = 0;
let used_units = 0;
if (empleadoId) {
  try {
    const [usedRows]: any[] = await conn.query(
      `SELECT
         COALESCE(SUM(monto_total_subsidio),0) AS used_amount,
         COALESCE(SUM(cantidad),0) AS used_units
       FROM subsidios_utilizados
       WHERE empleado_id = ?
         AND (
           fecha = CURRENT_DATE()
           OR DATE(created_at) = CURRENT_DATE()
         )`,
      [empleadoId]
    );
    if (usedRows.length) {
      used_amount = Number(usedRows[0].used_amount || 0);
      used_units = Number(usedRows[0].used_units || 0);
    }
  } catch (err) {
    console.warn('previewVenta: error leyendo subsidios usados', (err as any)?.message ?? err);
  }
}


  // Disponibilidad inicial: si hay regla global la usamos, si no la marcamos null para aplicar por-producto
  let monto_restante: number | null = null;
  let unidades_restantes = Math.max(0, regla.unidades_diarias - used_units);
  if (regla.monto_diario && Number(regla.monto_diario) > 0) {
    monto_restante = Math.max(0, Number(regla.monto_diario) - used_amount);
  } else {
    monto_restante = null;
  }

  // 6) Precargar productos
  const productoIds = Array.from(new Set(lineas.map(l => Number(l.producto_id)).filter(Boolean)));
  const productosMap: Record<number, any> = {};
  if (productoIds.length) {
    try {
      const [pRows]: any[] = await conn.query(
        `SELECT id, nombre, aplica_subsidio, subsidio_id, precio_venta
         FROM productos
         WHERE id IN (${productoIds.map(() => '?').join(',')})`,
        productoIds
      );
      for (const p of pRows) productosMap[p.id] = p;
    } catch (err) {
      console.warn('previewVenta: error precargando productos', (err as any)?.message ?? err);
    }
  }

  // 7) Precargar subsidios referenciados por productos (si hay subsidio_id)
  const subsidioIds = Array.from(new Set(Object.values(productosMap).map((p: any) => Number(p.subsidio_id)).filter(Boolean)));
  const subsidiosMap: Record<number, any> = {};
  if (subsidioIds.length) {
    try {
      const [sRows]: any[] = await conn.query(
        `SELECT id, tipo, monto_fijo, porcentaje FROM subsidios WHERE id IN (${subsidioIds.map(() => '?').join(',')})`,
        subsidioIds
      );
      for (const s of sRows) subsidiosMap[s.id] = s;
    } catch (err) {
      console.warn('previewVenta: error precargando subsidios', (err as any)?.message ?? err);
    }
  }

  // 8) Cálculo por renglón
  // Guardar per-product candidates temporales para cálculo de subsidio_disponible si no hay regla global
  const perProductCandidates: any[] = [];

  for (const l of lineas) {
    const productoId = Number(l.producto_id);
    const cantidad = Math.max(0, Number(l.cantidad || 0));
    const precio_unit = Number(l.precio_unitario || 0);
    totalBruto += cantidad * precio_unit;

    const producto = productosMap[productoId] ?? null;

    let aplica_subsidio_linea = Boolean(l.aplica_subsidio);
    let motivo_no_subsidio: string | null = null;
    let subsidio_aplicado_por_unidad = 0;
    let subsidio_aplicado_total = 0;

    const empleado_permite_subsidio = Boolean(empleado?.aplica_subsidio);

    if (!aplica_subsidio_linea) {
      motivo_no_subsidio = 'no_solicitado_por_linea';
    } else if (!empleado) {
      motivo_no_subsidio = 'empleado_no_presente';
      aplica_subsidio_linea = false;
    } else if (!empleado_permite_subsidio) {
      motivo_no_subsidio = 'empleado_sin_derecho';
      aplica_subsidio_linea = false;
    } else if (!producto) {
      motivo_no_subsidio = 'producto_no_encontrado';
      aplica_subsidio_linea = false;
    } else if (!producto.aplica_subsidio) {
      motivo_no_subsidio = 'producto_no_subsidiable';
      aplica_subsidio_linea = false;
    } else {
      // determinar monto por unidad: prioridad -> linea.override -> subsidio record -> 0
      let perUnitCandidate = Number(l.subsidio_por_unidad ?? 0);
      if (!perUnitCandidate && producto?.subsidio_id) {
        const subs = subsidiosMap[producto.subsidio_id];
        if (subs) {
          if ((subs.tipo ?? '').toString() === 'fijo' && Number(subs.monto_fijo || 0) > 0) {
            perUnitCandidate = Number(subs.monto_fijo || 0);
          } else if ((subs.tipo ?? '').toString() === 'porcentaje' && Number(subs.porcentaje || 0) > 0) {
            perUnitCandidate = Number(((Number(subs.porcentaje || 0) / 100) * precio_unit).toFixed(2));
          }
        }
      }
      if (!perUnitCandidate) perUnitCandidate = 0;

      subsidio_aplicado_por_unidad = Math.min(perUnitCandidate, precio_unit);
      if (subsidio_aplicado_por_unidad <= 0) {
        motivo_no_subsidio = 'subsidio_cero_por_unidad';
        aplica_subsidio_linea = false;
      } else {
        // calcular aplicación respetando regla global si existe
        const unidadesAplicables = Math.min(unidades_restantes, cantidad);
        const posibleTotal = subsidio_aplicado_por_unidad * unidadesAplicables;

        if (monto_restante !== null) {
          const aplicado = Math.min(posibleTotal, monto_restante);
          const unidadesSubsidiadas = subsidio_aplicado_por_unidad > 0 ? Math.floor(aplicado / subsidio_aplicado_por_unidad) : 0;
          subsidio_aplicado_total = subsidio_aplicado_por_unidad * unidadesSubsidiadas;
          monto_restante = Math.max(0, (monto_restante as number) - subsidio_aplicado_total);
          unidades_restantes = Math.max(0, unidades_restantes - unidadesSubsidiadas);
          if (subsidio_aplicado_total <= 0) {
            motivo_no_subsidio = 'agotado_por_monto';
            aplica_subsidio_linea = false;
          }
        } else {
          // sin regla global: aplicar por-producto hasta unidadesAplicables
          const unidadesSubsidiadas = unidadesAplicables;
          subsidio_aplicado_total = subsidio_aplicado_por_unidad * unidadesSubsidiadas;
          unidades_restantes = Math.max(0, unidades_restantes - unidadesSubsidiadas);
        }
      }
    }

    perProductCandidates.push({
      producto_id: productoId,
      cantidad,
      aplica_subsidio: Boolean(aplica_subsidio_linea),
      subsidio_aplicado_por_unidad: Number(subsidio_aplicado_por_unidad.toFixed(2))
    });

    subsidioPorProducto.push({
      producto_id: productoId,
      cantidad,
      precio_unit,
      aplica_subsidio: Boolean(aplica_subsidio_linea),
      subsidio_aplicado_por_unidad: Number(subsidio_aplicado_por_unidad.toFixed(2)),
      subsidio_aplicado_total: Number(subsidio_aplicado_total.toFixed(2)),
      motivo_no_subsidio
    });
  }

  // 9) Totales
  const subsidioEstimado = subsidioPorProducto.reduce((s, p) => s + Number(p.subsidio_aplicado_total || 0), 0);

  // calcular subsidio_disponible: si regla global existe, usar monto_restante original; si no, sumar capacidad por-producto
  let subsidioDisponible: number;
  if (regla.monto_diario && Number(regla.monto_diario) > 0) {
    subsidioDisponible = Math.max(0, Number(regla.monto_diario) - used_amount);
  } else {
    let tempUnidades = Math.max(0, regla.unidades_diarias - used_units);
    let sumPossible = 0;
    for (const p of perProductCandidates) {
      if (!p.aplica_subsidio) continue;
      const units = Math.min(tempUnidades, p.cantidad);
      sumPossible += Number(p.subsidio_aplicado_por_unidad || 0) * units;
      tempUnidades = Math.max(0, tempUnidades - units);
    }
    subsidioDisponible = Number(sumPossible.toFixed(2));
  }

  const subsidiosRestantesCount = Math.max(0, regla.unidades_diarias - used_units);
  const totalRecomendado = Math.max(0, Number((totalBruto - subsidioEstimado).toFixed(2)));
  const preview_meta = { timestamp: new Date().toISOString(), rules_version: regla.rules_version ?? 'v1' };

  return {
    empleado: empleado ? { id: empleado.id, nombre: empleado.nombre, aplica_subsidio: Boolean(empleado.aplica_subsidio) } : null,
    saldo_monedero: Number(saldoMonedero.toFixed(2)),
    total_bruto: Number(totalBruto.toFixed(2)),
    subsidio_estimado: Number(subsidioEstimado.toFixed(2)),
    subsidio_disponible: Number(subsidioDisponible.toFixed(2)),
    subsidios_restantes_count: Number(subsidiosRestantesCount),
    subsidio_por_producto: subsidioPorProducto,
    total_recomendado: Number(totalRecomendado.toFixed(2)),
    preview_meta,
    detallesProcesados: subsidioPorProducto
  };
}

export async function previewVenta(req: Request, res: Response): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    const { empleado_id, monedero_id, lineas } = req.body;
    if (!Array.isArray(lineas)) { res.status(400).json({ ok: false, reason: 'missing_lines' }); return; }

    const parsedLineas: LineaInput[] = lineas.map((l: any) => ({
      producto_id: Number(l.producto_id),
      cantidad: Number(l.cantidad || 0),
      precio_unitario: Number(l.precio_unitario || 0),
      aplica_subsidio: Boolean(l.aplica_subsidio),
      subsidio_por_unidad: l.subsidio_por_unidad !== undefined ? Number(l.subsidio_por_unidad) : undefined
    }));

    const preview = await calcularPreview(conn, empleado_id ?? null, monedero_id ?? null, parsedLineas);

    res.json({ ok: true, ...preview });
    return;
  } catch (err: any) {
    console.error('ERROR previewVenta', (err as any)?.message ?? err);
    res.status(500).json({ ok: false, reason: 'server_error' });
    return;
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
}
