// src/models/usuarios/UsuarioUbicacion.ts
import { getPool } from '../../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ====================================
// INTERFACES
// ====================================

export interface UsuarioUbicacionData {
  id?: number;
  usuario_id: number;
  ubicacion_id: number;
  asignado_por?: number;
  fecha_asignacion?: Date;
  activo?: boolean;
}

export interface UsuarioUbicacionDetallada extends UsuarioUbicacionData {
  usuario_nombre?: string;
  usuario_email?: string;
  ubicacion_nombre?: string;
  ubicacion_codigo?: string;
  asignado_por_nombre?: string;
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
// CLASE USUARIO UBICACION
// ====================================

export class UsuarioUbicacion {

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
      console.log(`✅ Auditoría registrada: ${data.accion} en ${data.tabla} #${data.registro_id}`);
    } catch (error) {
      console.error('❌ Error al registrar auditoría:', error);
    }
  }

  // ====================================
  // LISTAR ASIGNACIONES
  // ====================================

  /**
   * Listar todas las asignaciones
   */
  static async getAll(): Promise<UsuarioUbicacionDetallada[]> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        uu.id,
        uu.usuario_id,
        uu.ubicacion_id,
        uu.asignado_por,
        uu.fecha_asignacion,
        uu.activo,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        ua.nombre_usuario AS asignado_por_nombre
      FROM usuario_ubicaciones uu
      INNER JOIN usuarios u ON uu.usuario_id = u.id
      INNER JOIN ubicaciones ub ON uu.ubicacion_id = ub.id
      LEFT JOIN usuarios ua ON uu.asignado_por = ua.id
      WHERE uu.activo = 1
      ORDER BY uu.fecha_asignacion DESC`
    );

    return rows.map(row => ({
      id: row.id,
      usuario_id: row.usuario_id,
      ubicacion_id: row.ubicacion_id,
      asignado_por: row.asignado_por,
      fecha_asignacion: row.fecha_asignacion,
      activo: !!row.activo,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      ubicacion_nombre: row.ubicacion_nombre,
      ubicacion_codigo: row.ubicacion_codigo,
      asignado_por_nombre: row.asignado_por_nombre
    }));
  }

  /**
   * Listar asignaciones de un usuario específico
   */
  static async getByUsuario(usuarioId: number): Promise<UsuarioUbicacionDetallada[]> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        uu.id,
        uu.usuario_id,
        uu.ubicacion_id,
        uu.asignado_por,
        uu.fecha_asignacion,
        uu.activo,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        ua.nombre_usuario AS asignado_por_nombre
      FROM usuario_ubicaciones uu
      INNER JOIN usuarios u ON uu.usuario_id = u.id
      INNER JOIN ubicaciones ub ON uu.ubicacion_id = ub.id
      LEFT JOIN usuarios ua ON uu.asignado_por = ua.id
      WHERE uu.usuario_id = ?
      ORDER BY uu.fecha_asignacion DESC`,
      [usuarioId]
    );

    return rows.map(row => ({
      id: row.id,
      usuario_id: row.usuario_id,
      ubicacion_id: row.ubicacion_id,
      asignado_por: row.asignado_por,
      fecha_asignacion: row.fecha_asignacion,
      activo: !!row.activo,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      ubicacion_nombre: row.ubicacion_nombre,
      ubicacion_codigo: row.ubicacion_codigo,
      asignado_por_nombre: row.asignado_por_nombre
    }));
  }

  /**
   * Listar usuarios asignados a una ubicación
   */
  static async getByUbicacion(ubicacionId: number): Promise<UsuarioUbicacionDetallada[]> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        uu.id,
        uu.usuario_id,
        uu.ubicacion_id,
        uu.asignado_por,
        uu.fecha_asignacion,
        uu.activo,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        ua.nombre_usuario AS asignado_por_nombre
      FROM usuario_ubicaciones uu
      INNER JOIN usuarios u ON uu.usuario_id = u.id
      INNER JOIN ubicaciones ub ON uu.ubicacion_id = ub.id
      LEFT JOIN usuarios ua ON uu.asignado_por = ua.id
      WHERE uu.ubicacion_id = ?
      ORDER BY uu.fecha_asignacion DESC`,
      [ubicacionId]
    );

    return rows.map(row => ({
      id: row.id,
      usuario_id: row.usuario_id,
      ubicacion_id: row.ubicacion_id,
      asignado_por: row.asignado_por,
      fecha_asignacion: row.fecha_asignacion,
      activo: !!row.activo,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      ubicacion_nombre: row.ubicacion_nombre,
      ubicacion_codigo: row.ubicacion_codigo,
      asignado_por_nombre: row.asignado_por_nombre
    }));
  }

  /**
   * Obtener una asignación por ID
   */
  static async getById(id: number): Promise<UsuarioUbicacionDetallada | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        uu.id,
        uu.usuario_id,
        uu.ubicacion_id,
        uu.asignado_por,
        uu.fecha_asignacion,
        uu.activo,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        ua.nombre_usuario AS asignado_por_nombre
      FROM usuario_ubicaciones uu
      INNER JOIN usuarios u ON uu.usuario_id = u.id
      INNER JOIN ubicaciones ub ON uu.ubicacion_id = ub.id
      LEFT JOIN usuarios ua ON uu.asignado_por = ua.id
      WHERE uu.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      ubicacion_id: row.ubicacion_id,
      asignado_por: row.asignado_por,
      fecha_asignacion: row.fecha_asignacion,
      activo: !!row.activo,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      ubicacion_nombre: row.ubicacion_nombre,
      ubicacion_codigo: row.ubicacion_codigo,
      asignado_por_nombre: row.asignado_por_nombre
    };
  }

  // ====================================
  // CREAR ASIGNACIÓN
  // ====================================

  /**
   * Crear una nueva asignación usuario-ubicación
   */
  static async create(
    data: UsuarioUbicacionData,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<number> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    // Validar que el usuario existe
    const [usuarioRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE id = ?',
      [data.usuario_id]
    );

    if (usuarioRows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Validar que la ubicación existe
    const [ubicacionRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM ubicaciones WHERE id = ?',
      [data.ubicacion_id]
    );

    if (ubicacionRows.length === 0) {
      throw new Error('Ubicación no encontrada');
    }

    // Validar que no exista ya la asignación
    const [existeRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuario_ubicaciones WHERE usuario_id = ? AND ubicacion_id = ?',
      [data.usuario_id, data.ubicacion_id]
    );

    if (existeRows.length > 0) {
      throw new Error('El usuario ya está asignado a esta ubicación');
    }

    // Crear la asignación
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuario_ubicaciones (usuario_id, ubicacion_id, asignado_por, activo) 
       VALUES (?, ?, ?, ?)`,
      [
        data.usuario_id,
        data.ubicacion_id,
        data.asignado_por || null,
        data.activo !== undefined ? (data.activo ? 1 : 0) : 1
      ]
    );

    const asignacionId = result.insertId;

    console.log(
      `✅ Usuario-Ubicación creado: id=${asignacionId} ` +
      `usuario=${data.usuario_id} ubicacion=${data.ubicacion_id}`
    );

    // Registrar auditoría
    await this.registrarAuditoria({
      tabla: 'usuario_ubicaciones',
      registro_id: asignacionId,
      accion: 'CREATE',
      usuario_id: userId,
      usuario_nombre: userName,
      datos_nuevos: {
        usuario_id: data.usuario_id,
        ubicacion_id: data.ubicacion_id,
        asignado_por: data.asignado_por,
        activo: data.activo !== undefined ? data.activo : true
      },
      ip_address: ip,
      user_agent: agent
    });

    return asignacionId;
  }

  // ====================================
  // ACTUALIZAR ASIGNACIÓN
  // ====================================

  /**
   * Actualizar una asignación (cambiar estado activo)
   */
  static async update(
    id: number,
    data: Partial<UsuarioUbicacionData>,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    // Obtener estado anterior
    const asignacionAnterior = await this.getById(id);
    if (!asignacionAnterior) {
      throw new Error('Asignación no encontrada');
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (data.activo !== undefined) {
      updates.push('activo = ?');
      params.push(data.activo ? 1 : 0);
    }

    if (updates.length === 0) {
      return false;
    }

    params.push(id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE usuario_ubicaciones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    console.log(`✅ Usuario-Ubicación actualizado: id=${id}`);

    // Registrar auditoría
    if (result.affectedRows > 0) {
      await this.registrarAuditoria({
        tabla: 'usuario_ubicaciones',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: { activo: asignacionAnterior.activo },
        datos_nuevos: data,
        ip_address: ip,
        user_agent: agent
      });
    }

    return result.affectedRows > 0;
  }

  // ====================================
  // ACTIVAR ASIGNACIÓN
  // ====================================

  /**
   * Activar una asignación
   */
  static async activate(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    const asignacion = await this.getById(id);
    if (!asignacion) {
      throw new Error('Asignación no encontrada');
    }

    if (asignacion.activo) {
      throw new Error('La asignación ya está activa');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE usuario_ubicaciones SET activo = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Usuario-Ubicación activado: id=${id}`);

      await this.registrarAuditoria({
        tabla: 'usuario_ubicaciones',
        registro_id: id,
        accion: 'REACTIVATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: { activo: false },
        datos_nuevos: { activo: true },
        ip_address: ip,
        user_agent: agent
      });

      return true;
    }

    return false;
  }

  // ====================================
  // DESACTIVAR ASIGNACIÓN
  // ====================================

  /**
   * Desactivar una asignación (soft delete)
   */
  static async deactivate(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    const asignacion = await this.getById(id);
    if (!asignacion) {
      throw new Error('Asignación no encontrada');
    }

    if (!asignacion.activo) {
      throw new Error('La asignación ya está inactiva');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE usuario_ubicaciones SET activo = 0 WHERE id = ?',
      [id]
    );

    console.log(`✅ Usuario-Ubicación desactivado: id=${id}`);

    if (result.affectedRows > 0) {
      await this.registrarAuditoria({
        tabla: 'usuario_ubicaciones',
        registro_id: id,
        accion: 'DEACTIVATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: { activo: true },
        datos_nuevos: { activo: false },
        ip_address: ip,
        user_agent: agent
      });
    }

    return result.affectedRows > 0;
  }

  // ====================================
  // ELIMINAR PERMANENTE
  // ====================================

  /**
   * Eliminar permanentemente una asignación
   */
  static async deletePermanently(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const pool = getPool('local');

    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';

    const asignacion = await this.getById(id);
    if (!asignacion) {
      throw new Error('Asignación no encontrada');
    }

    // Registrar auditoría ANTES de eliminar
    await this.registrarAuditoria({
      tabla: 'usuario_ubicaciones',
      registro_id: id,
      accion: 'DELETE',
      usuario_id: userId,
      usuario_nombre: userName,
      datos_anteriores: asignacion,
      ip_address: ip,
      user_agent: agent
    });

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM usuario_ubicaciones WHERE id = ?',
      [id]
    );

    console.log(`⚠️ Usuario-Ubicación eliminado PERMANENTEMENTE: id=${id}`);

    return result.affectedRows > 0;
  }

  // ====================================
  // HISTORIAL
  // ====================================

  /**
   * Obtener historial de auditoría de una asignación
   */
  static async getHistorial(id: number): Promise<any[]> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          id,
          accion,
          usuario_id,
          usuario_nombre,
          datos_anteriores,
          datos_nuevos,
          ip_address,
          user_agent,
          fecha
         FROM auditoria
         WHERE tabla = 'usuario_ubicaciones' AND registro_id = ?
         ORDER BY fecha DESC`,
        [id]
      );
      return rows;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  }
}