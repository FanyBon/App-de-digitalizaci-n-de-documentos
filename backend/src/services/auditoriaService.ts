// src/services/auditoriaService.ts
import { getPool } from '../config/db_controlcomidas';
import { RowDataPacket } from 'mysql2';

export interface AuditoriaData {
  tabla: string;
  registro_id: number;
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'REACTIVATE' | 'DEACTIVATE';
  usuario_id: number;
  usuario_nombre: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  ip_address?: string;
  user_agent?: string;
}

export class AuditoriaService {
  /**
   * Registrar una acción en la tabla de auditoría
   */
  static async registrar(data: AuditoriaData): Promise<void> {
    const pool = getPool('local');

    try {
      await pool.query(
        `
        INSERT INTO auditoria (
          tabla, registro_id, accion, usuario_id, usuario_nombre,
          datos_anteriores, datos_nuevos, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          data.tabla,
          data.registro_id,
          data.accion,
          data.usuario_id,
          data.usuario_nombre,
          data.datos_anteriores ? JSON.stringify(data.datos_anteriores) : null,
          data.datos_nuevos ? JSON.stringify(data.datos_nuevos) : null,
          data.ip_address || null,
          data.user_agent || null
        ]
      );

      console.log(
        `✅ AUDITORIA: ${data.accion} en ${data.tabla} id=${data.registro_id} ` +
        `por ${data.usuario_nombre} (id=${data.usuario_id})`
      );
    } catch (error) {
      console.error('❌ Error al registrar auditoría (no crítico):', error);
    }
  }

  /**
   * Obtener historial de un registro específico
   */
  static async getHistorial(tabla: string, registroId: number) {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        a.id,
        a.accion,
        a.usuario_id,
        a.usuario_nombre,
        a.datos_anteriores,
        a.datos_nuevos,
        a.ip_address,
        a.user_agent,
        a.fecha
      FROM auditoria a
      WHERE a.tabla = ? AND a.registro_id = ?
      ORDER BY a.fecha DESC
      `,
      [tabla, registroId]
    );

    return rows.map(row => ({
      id: row.id,
      accion: row.accion,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      datos_anteriores: row.datos_anteriores,
      datos_nuevos: row.datos_nuevos,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      fecha: row.fecha
    }));
  }
}