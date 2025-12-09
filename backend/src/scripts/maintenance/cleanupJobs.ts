// src/scripts/maintenance/cleanupJobs.ts
import cron from 'node-cron';
import { getConnection } from '../../config/db_controlcomidas';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'maintenance.log');

function ensureLogDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) { /* noop */ }
}

function log(msg: string) {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
  } catch (e) {
    console.error('Failed to write maintenance log', e);
  }
}

export function startMaintenanceJobs() {
  // Métricas cada hora (en minuto 0 de cada hora)
  cron.schedule('0 * * * *', async () => {
    let conn: any = null;
    try {
      conn = await getConnection('local');
      const [reserved]: any = await conn.query(
        "SELECT COUNT(*) AS cnt FROM idempotency_keys WHERE status = 'reserved' AND expires_at < NOW()"
      );
      const cnt = Array.isArray(reserved) && reserved.length ? reserved[0].cnt : (reserved?.cnt ?? 0);
      log(`HOUR_METRICS reservedExpired=${cnt}`);
      console.log(`HOUR_METRICS reservedExpired=${cnt}`);
    } catch (err) {
      log(`HOUR_METRICS_ERROR ${String(err)}`);
      console.error('HOUR_METRICS_ERROR', err);
    } finally {
      if (conn && typeof conn.release === 'function') conn.release();
    }
  });

  // Limpieza cada hora (en minuto 5 de cada hora)
  cron.schedule('5 * * * *', async () => {
    let conn: any = null;
    try {
      conn = await getConnection('local');

      // Mover idempotency_keys expiradas
      const [movedIdemp]: any = await conn.query(
        `INSERT INTO idempotency_keys_archive (key_id, created_at, expires_at, status, result, user_ident, archived_at)
         SELECT key_id, created_at, expires_at, status, result, user_ident, NOW()
         FROM idempotency_keys
         WHERE status = 'reserved' AND expires_at < NOW()`
      );
      const [delIdemp]: any = await conn.query(
        `DELETE FROM idempotency_keys WHERE status = 'reserved' AND expires_at < NOW()`
      );

      // Mover nip_tokens expirados y no consumidos
      const [movedTok]: any = await conn.query(
        `INSERT INTO nip_tokens_archive (token, empleado_id, monedero_id, issued_at, expires_at, consumed_at, payload, archived_at)
         SELECT token, empleado_id, monedero_id, issued_at, expires_at, consumed_at, payload, NOW()
         FROM nip_tokens
         WHERE expires_at < NOW() AND consumed_at IS NULL`
      );
      const [delTok]: any = await conn.query(
        `DELETE FROM nip_tokens WHERE expires_at < NOW() AND consumed_at IS NULL`
      );

      const movedIdempCount = movedIdemp?.affectedRows ?? movedIdemp?.affected_rows ?? 0;
      const delIdempCount = delIdemp?.affectedRows ?? delIdemp?.affected_rows ?? 0;
      const movedTokCount = movedTok?.affectedRows ?? movedTok?.affected_rows ?? 0;
      const delTokCount = delTok?.affectedRows ?? delTok?.affected_rows ?? 0;

      log(`HOUR_CLEANUP moved_idempotency=${movedIdempCount} deleted_idempotency=${delIdempCount} moved_tokens=${movedTokCount} deleted_tokens=${delTokCount}`);
      console.log(`HOUR_CLEANUP moved_idempotency=${movedIdempCount} deleted_idempotency=${delIdempCount} moved_tokens=${movedTokCount} deleted_tokens=${delTokCount}`);
    } catch (err) {
      log(`HOUR_CLEANUP_ERROR ${String(err)}`);
      console.error('HOUR_CLEANUP_ERROR', err);
    } finally {
      if (conn && typeof conn.release === 'function') conn.release();
    }
  });

  // ⭐ NUEVO: Limpieza de sesiones inactivas cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    let conn: any = null;
    try {
      conn = await getConnection('local');

      // Cerrar sesiones con más de 8 horas de inactividad
      const [expiredSessions]: any = await conn.query(
        `
        UPDATE sesiones_usuario 
        SET activa = 0, 
            fecha_fin = NOW() 
        WHERE activa = 1 
          AND last_activity < DATE_SUB(NOW(), INTERVAL 8 HOUR)
        `
      );

      const closedCount = expiredSessions?.affectedRows ?? expiredSessions?.affected_rows ?? 0;

      if (closedCount > 0) {
        log(`SESSION_CLEANUP: Cerradas ${closedCount} sesión(es) por inactividad (>8 horas)`);
        console.log(`SESSION_CLEANUP: Cerradas ${closedCount} sesión(es) por inactividad (>8 horas)`);
      }

    } catch (err) {
      log(`SESSION_CLEANUP_ERROR ${String(err)}`);
      console.error('SESSION_CLEANUP_ERROR', err);
    } finally {
      if (conn && typeof conn.release === 'function') conn.release();
    }
  });

  ensureLogDir();
  log('Maintenance jobs scheduled (metrics + cleanup + session cleanup)');
  console.log('Maintenance jobs scheduled (metrics + cleanup + session cleanup)');
}