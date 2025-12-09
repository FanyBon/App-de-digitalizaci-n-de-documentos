import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyNip } from '../../utils/nip';
import { getPool } from '../../config/db_controlcomidas';

const NIP_TTL_SECONDS = Number(process.env.NIP_TOKEN_TTL_SECONDS ?? 30);

export async function validarNip(req: Request, res: Response): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    const { empleado_id, nip, monedero_id, intento_por } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || null;
    if (!empleado_id || !nip) { res.status(400).json({ ok: false, reason: 'missing' }); return; }

    const [empRows]: any[] = await conn.query(
      'SELECT id, nip_hash, nip_failed_attempts, nip_locked_until FROM empleados WHERE id = ? LIMIT 1',
      [empleado_id]
    );
    if (!empRows.length) { res.status(404).json({ ok: false, reason: 'empleado_not_found' }); return; }
    const empleado = empRows[0];

    if (empleado.nip_locked_until && new Date(empleado.nip_locked_until) > new Date()) {
      res.status(423).json({ ok: false, reason: 'locked' }); return;
    }

    const ok = await verifyNip(String(nip), empleado.nip_hash);

    await conn.query(
      'INSERT INTO nip_attempts (empleado_id, monedero_id, intento_por, ip, successful, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [empleado_id, monedero_id ?? null, intento_por ?? 'ventas.validate', ip, ok ? 1 : 0]
    );

    if (!ok) {
      const windowMinutes = Number(process.env.NIP_WINDOW_MINUTES ?? 60);
      const [cntRows]: any[] = await conn.query(
        `SELECT COUNT(*) AS fails FROM nip_attempts
         WHERE empleado_id = ? AND successful = 0 AND created_at >= (NOW() - INTERVAL ? MINUTE)`,
        [empleado_id, windowMinutes]
      );
      const fails = Number(cntRows[0]?.fails ?? 0);
      const MAX_FAILS = Number(process.env.NIP_MAX_FAILS ?? 5);
      const BLOCK_MINUTES = Number(process.env.NIP_BLOCK_MINUTES ?? 30);

      if (fails >= MAX_FAILS) {
        await conn.query('UPDATE empleados SET nip_locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?', [BLOCK_MINUTES, empleado_id]);
        res.status(423).json({ ok: false, reason: 'locked' }); return;
      }

      res.status(401).json({ ok: false, reason: 'invalid' }); return;
    }

    await conn.query('UPDATE empleados SET nip_failed_attempts = 0, nip_locked_until = NULL WHERE id = ?', [empleado_id]);

    // --- EMITIR TOKEN Y GUARDAR EN nip_tokens ---
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + NIP_TTL_SECONDS * 1000); // JS Date for insertion
    const payload = JSON.stringify({ empleado_id, monedero_id: monedero_id ?? null, issued_at: new Date().toISOString() });

    await conn.query(
      `INSERT INTO nip_tokens (token, empleado_id, monedero_id, issued_at, expires_at, payload)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [token, empleado_id, monedero_id ?? null, expiresAt, payload]
    );

    res.json({ ok: true, nip_validation_token: token });
    return;
  } catch (err: any) {
    console.error('ERROR validarNip', err);
    res.status(500).json({ ok: false, reason: 'server_error' }); return;
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
}

// PUT /api/empleados/:id/unlock-nip
export async function unlockNip(req: Request, res: Response): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    const empleadoId = Number(req.params.id);
    if (!empleadoId) { res.status(400).json({ ok: false, reason: 'missing' }); return; }

    // Actualizar empleado
    await conn.query(
      'UPDATE empleados SET nip_locked_until = NULL, nip_failed_attempts = 0 WHERE id = ?',
      [empleadoId]
    );

    // Registrar auditoría del desbloqueo
    await conn.query(
      'INSERT INTO nip_attempts (empleado_id, monedero_id, intento_por, ip, successful, created_at) VALUES (?, NULL, ?, ?, ?, NOW())',
      [empleadoId, 'admin.unlock', req.ip ?? null, 0]
    );

    res.json({ ok: true });
    return;
  } catch (err: any) {
    console.error('ERROR unlockNip', err);
    res.status(500).json({ ok: false, reason: 'server_error' });
    return;
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
}


