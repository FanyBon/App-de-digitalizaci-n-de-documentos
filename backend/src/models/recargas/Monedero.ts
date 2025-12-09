// src/models/recargas/Monedero.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ====================================
// INTERFACES
// ====================================

export interface MonederoInterface {
  id?: number;
  empleado_id: number;
  saldo_actual: number;
  fecha_creacion?: Date;
  activo: number;
}

interface AuditoriaData {
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

// ====================================
// CLASE MONEDERO
// ====================================

export class Monedero {

  // ====================================
  // MÉTODOS PRIVADOS DE AUDITORÍA
  // ====================================

  private static async registrarAuditoria(data: AuditoriaData): Promise<void> {
    const pool = getPool('local');
    try {
      await pool.query(
        `INSERT INTO auditoria 
         (tabla, registro_id, accion, usuario_id, usuario_nombre, 
          datos_anteriores, datos_nuevos, ip_address, user_agent, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
    } catch (error) {
      console.error('❌ Error al registrar auditoría:', error);
    }
  }

  private static async obtenerDatosActuales(id: number): Promise<any | null> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM monederos WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error al obtener datos actuales:', error);
      return null;
    }
  }

  // ====================================
  // LISTAR MONEDEROS
  // ====================================
  
  static async listar(): Promise<MonederoInterface[]> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, 
                e.nombre as empleado_nombre,
                e.cedula as empleado_cedula
         FROM monederos m
         LEFT JOIN empleados e ON m.empleado_id = e.id
         WHERE m.activo = 1
         ORDER BY m.id DESC`
      );
      return rows as MonederoInterface[];
    } catch (error) {
      console.error('Error al listar monederos:', error);
      throw new Error('Error al listar monederos');
    }
  }

  static async obtenerPorId(id: number): Promise<MonederoInterface | null> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, 
                e.nombre as empleado_nombre,
                e.cedula as empleado_cedula
         FROM monederos m
         LEFT JOIN empleados e ON m.empleado_id = e.id
         WHERE m.id = ?`,
        [id]
      );
      if (rows.length === 0) return null;
      return rows[0] as MonederoInterface;
    } catch (error) {
      console.error('Error al obtener monedero:', error);
      throw new Error('Error al obtener monedero');
    }
  }

  static async obtenerSaldoPorCodigo(
    codigo: string
  ): Promise<{ empleado_id: number; saldo_actual: number } | null> {
    const pool = getPool('local');
    const [rows]: any = await pool.query(
      `SELECT m.empleado_id, m.saldo_actual
       FROM monederos m
       JOIN empleados e ON m.empleado_id = e.id
       WHERE e.codigo_barras = ?
         AND m.activo = 1
       LIMIT 1`,
      [codigo]
    );
    return rows[0] || null;
  }

  static async obtenerSaldoPorQR(
    codigoQR: string
  ): Promise<{ empleado_id: number; saldo_actual: number } | null> {
    const pool = getPool('local');
    const [rows]: any = await pool.query(
      `SELECT m.empleado_id, m.saldo_actual
       FROM monederos m
       JOIN empleados e ON m.empleado_id = e.id
       WHERE e.codigo_qr = ?
         AND m.activo = 1
       LIMIT 1`,
      [codigoQR]
    );
    return rows[0] || null;
  }

  // ====================================
  // CREAR MONEDERO
  // ====================================

  static async crear(
    monedero: MonederoInterface,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pool = getPool('local');
    
    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    try {
      // Verificar que el empleado existe
      const [empleados] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM empleados WHERE id = ?',
        [monedero.empleado_id]
      );

      if (empleados.length === 0) {
        return { success: false, error: 'El empleado no existe' };
      }

      // Verificar si ya tiene monedero
      const [existente] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM monederos WHERE empleado_id = ? AND activo = 1',
        [monedero.empleado_id]
      );

      if (existente.length > 0) {
        return { success: false, error: 'El empleado ya tiene un monedero activo' };
      }

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO monederos (empleado_id, saldo_actual, fecha_creacion, activo) 
         VALUES (?, ?, NOW(), ?)`,
        [monedero.empleado_id, monedero.saldo_actual, monedero.activo]
      );

      const nuevoMonedero = {
        id: result.insertId,
        empleado_id: monedero.empleado_id,
        saldo_actual: monedero.saldo_actual,
        activo: monedero.activo,
        fecha_creacion: new Date()
      };

      await this.registrarAuditoria({
        tabla: 'monederos',
        registro_id: result.insertId,
        accion: 'CREATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_nuevos: nuevoMonedero,
        ip_address: ip,
        user_agent: agent
      });

      return { success: true, data: nuevoMonedero };
    } catch (error: any) {
      console.error('❌ Error al crear monedero:', error);
      return { success: false, error: 'Error al crear el monedero' };
    }
  }

  // ====================================
  // EDITAR MONEDERO
  // ====================================

  static async editar(
    id: number,
    data: Partial<MonederoInterface>,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Monedero no encontrado' };
      }

      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE monederos SET ? WHERE id = ?`,
        [data, id]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'No se pudo actualizar el monedero' };
      }

      const datosNuevos = await this.obtenerDatosActuales(id);

      await this.registrarAuditoria({
        tabla: 'monederos',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        ip_address: ip,
        user_agent: agent
      });

      return { success: true, data: datosNuevos };
    } catch (error: any) {
      console.error('❌ Error al editar monedero:', error);
      return { success: false, error: 'Error al editar el monedero' };
    }
  }

  // ====================================
  // ELIMINAR MONEDERO (SOFT DELETE)
  // ====================================

  static async eliminar(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Monedero no encontrado' };
      }

      // Soft delete
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE monederos SET activo = 0 WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'No se pudo eliminar el monedero' };
      }

      await this.registrarAuditoria({
        tabla: 'monederos',
        registro_id: id,
        accion: 'DEACTIVATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        ip_address: ip,
        user_agent: agent
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error al eliminar monedero:', error);
      return { success: false, error: 'Error al eliminar el monedero' };
    }
  }

  /**
   * Elimina permanentemente un monedero (hard delete)
   */
  static async eliminarPermanente(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Monedero no encontrado' };
      }

      // Registrar auditoría ANTES de eliminar
      await this.registrarAuditoria({
        tabla: 'monederos',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        ip_address: ip,
        user_agent: agent
      });

      // Eliminar permanentemente
      const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM monederos WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'No se pudo eliminar el monedero' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error al eliminar permanentemente monedero:', error);
      
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return { 
          success: false, 
          error: 'No se puede eliminar el monedero porque tiene registros relacionados' 
        };
      }
      
      return { success: false, error: 'Error al eliminar permanentemente el monedero' };
    }
  }
}