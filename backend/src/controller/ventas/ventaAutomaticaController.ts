// src/controllers/ventas/ventaAutomaticaController.ts
import { Request, Response } from 'express';
import { getConnection, getPool } from '../../config/db_controlcomidas';

type AnyRow = { [k: string]: any };

export const listAutoChargeProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getPool('local');
    const [rows]: any = await pool.query(
      `SELECT id, nombre, codigo_barras, precio_venta, aplica_subsidio, familia_id, categoria_id, auto_charge, impuesto_id, subsidio_id
         FROM productos
        WHERE auto_charge = 1
        ORDER BY nombre`
    );
    console.log('[listAutoChargeProducts] rows:', Array.isArray(rows) ? rows.length : typeof rows);
    res.status(200).json(rows);
    return;
  } catch (err) {
    console.error('listAutoChargeProducts error', err);
    res.status(500).json({ error: 'error_list_products' });
    return;
  }
};

export const autoCharge = async (req: Request, res: Response): Promise<void> => {
  console.log('[autoCharge] incoming body:', JSON.stringify(req.body));

  const {
    empleado_id,
    product_id,
    cantidad = 1,          // por compatibilidad: si frontend no envía, tomamos 1
    nip_token,
    terminal_id,
    cajero_id
  } = req.body;

  const idempotencyKey = (req.header('X-Idempotency-Key') || null) as string | null;
  console.log('[autoCharge] idempotencyKey:', idempotencyKey);

  if (!empleado_id || !product_id || !nip_token || !idempotencyKey) {
    console.warn('[autoCharge] missing parameters');
    res.status(400).json({ error: 'missing_parameters' });
    return;
  }

  let conn: any = null;
  try {
    conn = await getConnection('local');
    await conn.beginTransaction();
    console.log('[autoCharge] DB transaction started');

    const actorId = cajero_id || (req as any).user?.id || null;
    const clientIp = req.ip || null;

    // ---- idempotency (FOR UPDATE) ----
    console.log('[autoCharge] checking idempotency key', idempotencyKey);
    const [ikRowsRaw]: AnyRow[] = await conn.query(
      'SELECT key_id, status, result FROM idempotency_keys WHERE key_id = ? FOR UPDATE',
      [idempotencyKey]
    );
    const ikRows = Array.isArray(ikRowsRaw) ? ikRowsRaw : [];
    if (ikRows.length) {
      const ik = ikRows[0];
      console.log('[autoCharge] idempotency row:', ik);
      if (ik.status === 'done') {
        await conn.commit();
        res.status(200).json({ ok: true, replay: true, payload: ik.result ? JSON.parse(ik.result) : null });
        return;
      }
      if (ik.status === 'reserved') {
        await conn.rollback();
        res.status(409).json({ error: 'idempotency_in_progress' });
        return;
      }
    } else {
      console.log('[autoCharge] reserving idempotency key');
      await conn.query(
        'INSERT INTO idempotency_keys (key_id, created_at, expires_at, status, user_ident, terminal_id, user_ip) VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE), ?, ?, ?, ?)',
        [idempotencyKey, 'reserved', actorId ? String(actorId) : null, terminal_id || null, clientIp]
      );
    }

    // ---- terminal validation (acepta id o codigo) ----
    let puntoVentaDbId: number | null = null;
    if (terminal_id !== undefined && terminal_id !== null && terminal_id !== '') {
      console.log('[autoCharge] validating terminal_id:', terminal_id);
      const isNumeric = !isNaN(Number(terminal_id));
      const pvQuery = isNumeric ? 'SELECT id, activo FROM puntos_venta WHERE id = ? LIMIT 1' : 'SELECT id, activo FROM puntos_venta WHERE codigo = ? LIMIT 1';
      const pvParams = isNumeric ? [Number(terminal_id)] : [String(terminal_id)];
      const [pvRowsRaw]: AnyRow[] = await conn.query(pvQuery, pvParams);
      const pvRows = Array.isArray(pvRowsRaw) ? pvRowsRaw : [];
      if (!pvRows.length) {
        await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'invalid_terminal' }), idempotencyKey]);
        await conn.rollback();
        res.status(400).json({ error: 'invalid_terminal' });
        return;
      }
      const pv = pvRows[0];
      if (!pv.activo) {
        await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'terminal_inactive' }), idempotencyKey]);
        await conn.rollback();
        res.status(400).json({ error: 'terminal_inactive' });
        return;
      }
      puntoVentaDbId = Number(pv.id);
      console.log('[autoCharge] terminal validated id=', puntoVentaDbId);
    }

    // ---- product validation ----
    console.log('[autoCharge] validating product id:', product_id);
    const [prodRowsRaw]: AnyRow[] = await conn.query(
      'SELECT id, nombre, precio_venta, aplica_subsidio, impuesto_id, subsidio_id, IFNULL(auto_charge,0) AS auto_charge FROM productos WHERE id = ? LIMIT 1',
      [product_id]
    );
    const prodRows = Array.isArray(prodRowsRaw) ? prodRowsRaw : [];
    if (!prodRows.length) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'product_not_found' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'product_not_found' });
      return;
    }
    const product: AnyRow = prodRows[0];
    console.log('[autoCharge] product row:', { id: product.id, precio_venta: product.precio_venta, aplica_subsidio: product.aplica_subsidio, auto_charge: product.auto_charge });

    if (Number(product.auto_charge) === 0) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'product_not_allowed' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'product_not_allowed' });
      return;
    }

    // ---- compute totals ----
    const unitPrice = Number(product.precio_venta);
    const qty = Math.max(1, Number(cantidad));
    let total = parseFloat((unitPrice * qty).toFixed(2));
    console.log('[autoCharge] unitPrice, qty, initial total:', { unitPrice, qty, total });

    // ---- subsidy logic ----
    let aplicoSubsidio = 0;
    let montoSubsidioAplicado = 0;
    // Only attempt subsidy if product.aplica_subsidio = 1 and product has subsidio_id
    if (Number(product.aplica_subsidio) === 1 && product.subsidio_id) {
      console.log('[autoCharge] product aplica_subsidio and has subsidio_id:', product.subsidio_id);

      // --- Check employee eligibility and remaining subsidios
      // ADVERTENCIA: Ajusta esta consulta si tu tabla empleados usa otros nombres.
      // Intenta leer flags comunes: 'tiene_subsidio' o 'subsidios_disponibles' o 'max_subsidios'
      const [empleadoRowsRaw]: AnyRow[] = await conn.query(
        `SELECT id,
                COALESCE(tiene_subsidio, 0) AS tiene_subsidio,
                COALESCE(subsidios_disponibles, NULL) AS subsidios_disponibles,
                COALESCE(max_subsidios, NULL) AS max_subsidios
           FROM empleados WHERE id = ? LIMIT 1`,
        [empleado_id]
      );
      const empleadoRows = Array.isArray(empleadoRowsRaw) ? empleadoRowsRaw : [];
      const empleado = empleadoRows.length ? empleadoRows[0] : null;
      if (empleado && Number(empleado.tiene_subsidio) === 1) {
        // Compute used subsidios (optionally per day or overall) — here we count total used ever; adjust if you have day limits
        const [usedRaw]: AnyRow[] = await conn.query(
          'SELECT COUNT(*) AS used_count, COALESCE(SUM(monto_subsidio),0) AS total_monto_subsidio FROM subsidios_utilizados WHERE empleado_id = ?',
          [empleado_id]
        );
        const used = Array.isArray(usedRaw) && usedRaw[0] ? usedRaw[0] : { used_count: 0, total_monto_subsidio: 0 };
        const usedCount = Number(used.used_count || 0);

        // Determine allowed remaining count if available
        let remainingCount: number | null = null;
        if (empleado.subsidios_disponibles !== null && empleado.subsidios_disponibles !== undefined) {
          remainingCount = Number(empleado.subsidios_disponibles) - usedCount;
        } else if (empleado.max_subsidios !== null && empleado.max_subsidios !== undefined) {
          remainingCount = Number(empleado.max_subsidios) - usedCount;
        } else {
          // If no counters available, assume allowed
          remainingCount = Number.POSITIVE_INFINITY;
        }

        console.log('[autoCharge] empleado subsidy info', { usedCount, remainingCount });

        if (remainingCount > 0) {
          // read subsidio definition (amount fijo or porcentaje)
          const [subRowsRaw]: AnyRow[] = await conn.query(
            'SELECT id, monto_fijo, porcentaje, tipo, descripcion FROM subsidios WHERE id = ? LIMIT 1',
            [product.subsidio_id]
          );
          const subRows = Array.isArray(subRowsRaw) ? subRowsRaw : [];
          if (subRows.length) {
            const subsidioDef = subRows[0];
            // two common models: monto_fijo or porcentaje
            if (subsidioDef.monto_fijo !== null && subsidioDef.monto_fijo !== undefined) {
              const montoFijo = Number(subsidioDef.monto_fijo);
              montoSubsidioAplicado = Math.min(montoFijo, total);
            } else if (subsidioDef.porcentaje !== null && subsidioDef.porcentaje !== undefined) {
              const pct = Number(subsidioDef.porcentaje);
              montoSubsidioAplicado = parseFloat((total * (pct / 100)).toFixed(2));
              montoSubsidioAplicado = Math.min(montoSubsidioAplicado, total);
            } else {
              montoSubsidioAplicado = 0;
            }

            if (montoSubsidioAplicado > 0) {
              aplicoSubsidio = 1;
              total = parseFloat((total - montoSubsidioAplicado).toFixed(2));
              console.log('[autoCharge] subsidio applied', { montoSubsidioAplicado, total });
            } else {
              console.log('[autoCharge] subsidioDef present but montoSubsidioAplicado 0');
            }
          } else {
            console.warn('[autoCharge] subsidio_id no existe:', product.subsidio_id);
          }
        } else {
          console.log('[autoCharge] empleado has no remaining subsidios');
        }
      } else {
        console.log('[autoCharge] empleado not eligible for subsidy or not found');
      }
    }

    // ---- impuesto: obtener impuesto_id desde producto y porcentaje ----
    let impuestoId: number | null = product.impuesto_id ?? null;
    let impuestoMonto = 0;
    let impuestoPorcentaje = 0;
    if (impuestoId) {
      const [impRowsRaw]: AnyRow[] = await conn.query('SELECT id, porcentaje FROM impuestos WHERE id = ? LIMIT 1', [impuestoId]);
      const impRows = Array.isArray(impRowsRaw) ? impRowsRaw : [];
      if (impRows.length && impRows[0].porcentaje !== undefined && impRows[0].porcentaje !== null) {
        impuestoPorcentaje = Number(impRows[0].porcentaje);
        impuestoMonto = parseFloat(( ( (unitPrice * qty) - ((unitPrice * qty) / (1 + impuestoPorcentaje / 100)) ) - (montoSubsidioAplicado) * (impuestoPorcentaje / (100 + impuestoPorcentaje)) ).toFixed(2));
        // Simpler, tax on total-after-subsidy: impuestoMonto = total - total/(1 + pct/100)
        // But if subsidy reduces taxable base, adjust as appropriate; above line attempts to reconcile.
        // To avoid complex edge cases, you can use:
        // impuestoMonto = parseFloat(( total - total / (1 + impuestoPorcentaje / 100) ).toFixed(2));
        impuestoMonto = parseFloat(( total - total / (1 + impuestoPorcentaje / 100) ).toFixed(2));
      } else {
        impuestoMonto = 0;
        impuestoPorcentaje = 0;
      }
    }

    // ---- validar nip_token FOR UPDATE ----
    console.log('[autoCharge] validating nip_token:', nip_token);
    const [tokenRowsRaw2]: AnyRow[] = await conn.query(
      'SELECT token, empleado_id, expires_at, consumed_at FROM nip_tokens WHERE token = ? FOR UPDATE',
      [nip_token]
    );
    const tokenRows2 = Array.isArray(tokenRowsRaw2) ? tokenRowsRaw2 : [];
    if (!tokenRows2.length) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'invalid_nip' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'invalid_nip' });
      return;
    }
    const token = tokenRows2[0];
    if (token.consumed_at !== null || new Date(token.expires_at) < new Date() || String(token.empleado_id) !== String(empleado_id)) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'invalid_nip' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'invalid_nip' });
      return;
    }

    // ---- lock wallet FOR UPDATE and check balance ----
    console.log('[autoCharge] locking wallet for empleado_id:', empleado_id);
    const [monRowsRaw]: AnyRow[] = await conn.query('SELECT id, saldo_actual, activo, requiere_nip FROM monederos WHERE empleado_id = ? FOR UPDATE', [empleado_id]);
    const monRows = Array.isArray(monRowsRaw) ? monRowsRaw : [];
    if (!monRows.length) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'no_wallet' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'no_wallet' });
      return;
    }
    const wallet = monRows[0];
    if (!wallet.activo) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'wallet_inactive' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'wallet_inactive' });
      return;
    }
    if (Number(wallet.saldo_actual) < total) {
      await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['failed', JSON.stringify({ error: 'insufficient_balance' }), idempotencyKey]);
      await conn.rollback();
      res.status(400).json({ error: 'insufficient_balance' });
      return;
    }

    // ---- metodo_pago_id para MONEDERO ----
    const [mpRowsRaw]: AnyRow[] = await conn.query("SELECT id FROM metodos_pago WHERE UPPER(codigo) = 'MONEDERO' AND activo = 1 LIMIT 1");
    const mpRows = Array.isArray(mpRowsRaw) ? mpRowsRaw : [];
    const metodoPagoId = mpRows.length ? Number(mpRows[0].id) : null;
    if (!metodoPagoId) console.warn('[autoCharge] metodo_pago MONEDERO not found; saving NULL in ventas_pdv');

    // ---- debit wallet ----
    console.log('[autoCharge] debiting wallet id:', wallet.id, 'amount:', total);
    await conn.query('UPDATE monederos SET saldo_actual = saldo_actual - ?, updated_at = NOW() WHERE id = ?', [total, wallet.id]);

    // ---- insert ventas_pdv (incluye metodo_pago_id, impuesto_id, impuesto_monto) ----
    const [insertHeaderRaw]: AnyRow[] = await conn.query(
      `INSERT INTO ventas_pdv
         (fecha_hora, empleado_id, usuario_id, total_venta, subsidio_aplicado, tipo_venta, monedero_id, metodo_pago_id, impuesto_id, impuesto_monto, created_at, referencia, punto_venta_id, punto_venta_codigo)
       VALUES (NOW(), ?, ?, ?, ?, 'pdv', ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        empleado_id,
        actorId,
        total,
        montoSubsidioAplicado,
        wallet.id,
        metodoPagoId,
        impuestoId,
        impuestoMonto,
        `auto:${idempotencyKey}`,
        puntoVentaDbId || null,
        terminal_id || null
      ]
    );
    const insertHeader = Array.isArray(insertHeaderRaw) ? insertHeaderRaw[0] : insertHeaderRaw;
    const ventaId = insertHeader.insertId;
    console.log('[autoCharge] ventas_pdv inserted id=', ventaId);

    // ---- insert detalle_venta (llenar impuesto_porcentaje e impuesto_monto por linea) ----
    // obtener porcentaje si existe
    let impuestoPctForLine = impuestoPorcentaje;
    if (impuestoId && impuestoPctForLine === 0) {
      const [impRowsRaw2]: AnyRow[] = await conn.query('SELECT porcentaje FROM impuestos WHERE id = ? LIMIT 1', [impuestoId]);
      const impRows2 = Array.isArray(impRowsRaw2) ? impRowsRaw2 : [];
      impuestoPctForLine = impRows2.length ? Number(impRows2[0].porcentaje) : 0;
    }
    await conn.query(
      `INSERT INTO detalle_venta
         (venta_id, producto_id, cantidad, precio_unitario, precio_unitario_neto, subsidio_aplicado, created_at, metodo_pago_id, impuesto_id, impuesto_porcentaje, impuesto_monto)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [ventaId, product_id, qty, unitPrice, unitPrice, aplicoSubsidio ? 1 : 0, metodoPagoId, impuestoId, impuestoPctForLine, impuestoMonto]
    );

    // ---- registrar movimiento en monedero_movimientos (traza) ----
    await conn.query(
      `INSERT INTO monedero_movimientos
         (monedero_id, tipo, monto, referencia, venta_id, punto_venta_id, punto_venta_codigo, idempotency_key, created_by, created_at)
       VALUES (?, 'debit', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [wallet.id, total, `venta_auto:${ventaId}`, ventaId, puntoVentaDbId || null, terminal_id || null, idempotencyKey, actorId || null]
    );

    // ---- si aplicó subsidio: registrar en subsidios_utilizados ----
    if (aplicoSubsidio && montoSubsidioAplicado > 0) {
      console.log('[autoCharge] inserting subsidios_utilizados trace');
      await conn.query(
        `INSERT INTO subsidios_utilizados
           (empleado_id, cantidad, fecha, monto_subsidio, monto_total_subsidio, usuario_id, observaciones, created_by, created_at, venta_id, producto_id)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          empleado_id,
          1,                            // cantidad de subsidios usados en esta operación (ajustar si varias unidades)
          montoSubsidioAplicado,
          montoSubsidioAplicado,        // monto_total_subsidio (por línea)
          actorId || null,              // usuario_id
          'autocobro',                  // observaciones
          actorId || null,              // created_by
          ventaId,
          product_id
        ]
      );
    }

    // ---- consumir nip_token (marcar consumed_at y payload) ----
    await conn.query(
      'UPDATE nip_tokens SET consumed_at = NOW(), consumed_by_ip = ?, payload = JSON_SET(IFNULL(payload, JSON_OBJECT()), ?, ?) WHERE token = ?',
      [clientIp, '$.venta_id', String(ventaId), nip_token]
    );

    // ---- actualizar idempotency_keys con resultado ----
    const [newSaldoRowRaw]: AnyRow[] = await conn.query('SELECT saldo_actual FROM monederos WHERE id = ?', [wallet.id]);
    const newSaldoRow = Array.isArray(newSaldoRowRaw) ? newSaldoRowRaw : [];
    const newSaldo = newSaldoRow && newSaldoRow[0] && newSaldoRow[0].saldo_actual ? Number(newSaldoRow[0].saldo_actual) : null;
    const resultPayload = { venta_id: ventaId, new_saldo: newSaldo, punto_venta_id: puntoVentaDbId };
    await conn.query('UPDATE idempotency_keys SET status = ?, result = ? WHERE key_id = ?', ['done', JSON.stringify(resultPayload), idempotencyKey]);

    await conn.commit();
    console.log('[autoCharge] transaction committed successfully');
    res.status(200).json({ ok: true, venta_id: ventaId, new_saldo: newSaldo });
    return;
  } catch (err) {
    console.error('autoCharge error:', err);
    try { if (conn) await conn.rollback(); } catch (_) { console.warn('[autoCharge] rollback failed'); }
    if (conn) {
      try { await conn.query('UPDATE idempotency_keys SET status = ? WHERE key_id = ?', ['failed', req.header('X-Idempotency-Key') || '']); } catch (_) {}
    }
    res.status(500).json({ error: 'server_error' });
    return;
  } finally {
    try { if (conn) conn.release(); } catch (e) { console.warn('release err', e); }
  }
};
