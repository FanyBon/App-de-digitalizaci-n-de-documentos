// src/models/usuarios_plataforma/UsuarioPerfil.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface UsuarioPerfilData {
  usuario_id: number;
  perfil_id: number;
  activo?: boolean;
  assigned_at?: Date;
  assigned_by?: number;
  assigned_ip?: string;
  removed_at?: Date | null;
  removed_by?: number | null;
  removed_ip?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface UsuarioPerfilDetallado extends UsuarioPerfilData {
  usuario_nombre?: string;
  usuario_email?: string;
  perfil_nombre?: string;
  perfil_descripcion?: string;
  assigned_by_nombre?: string;
  removed_by_nombre?: string;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class UsuarioPerfil {
  /**
   * Listar todas las asignaciones (con filtros)
   */
  static async getAll(filters?: {
    usuario_id?: number;
    perfil_id?: number;
    activo?: boolean;
  }): Promise<UsuarioPerfilDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        up.usuario_id,
        up.perfil_id,
        up.activo,
        up.assigned_at,
        up.assigned_by,
        up.assigned_ip,
        up.removed_at,
        up.removed_by,
        up.removed_ip,
        up.created_at,
        up.updated_at,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        p.nombre AS perfil_nombre,
        p.descripcion AS perfil_descripcion,
        ua.nombre_usuario AS assigned_by_nombre,
        ur.nombre_usuario AS removed_by_nombre
      FROM usuario_perfiles up
      INNER JOIN usuarios u ON up.usuario_id = u.id
      INNER JOIN perfiles p ON up.perfil_id = p.id
      LEFT JOIN usuarios ua ON up.assigned_by = ua.id
      LEFT JOIN usuarios ur ON up.removed_by = ur.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.usuario_id !== undefined) {
      query += ' AND up.usuario_id = ?';
      params.push(filters.usuario_id);
    }

    if (filters?.perfil_id !== undefined) {
      query += ' AND up.perfil_id = ?';
      params.push(filters.perfil_id);
    }

    if (filters?.activo !== undefined) {
      query += ' AND up.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    query += ' ORDER BY up.assigned_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToUsuarioPerfil(row));
  }

  /**
   * Listar perfiles activos de un usuario
   */
  static async getPerfilesByUsuario(usuarioId: number): Promise<UsuarioPerfilDetallado[]> {
    return this.getAll({ usuario_id: usuarioId, activo: true });
  }

  /**
   * Listar usuarios activos con un perfil específico
   */
  static async getUsuariosByPerfil(perfilId: number): Promise<UsuarioPerfilDetallado[]> {
    return this.getAll({ perfil_id: perfilId, activo: true });
  }

  /**
   * Verificar si existe una asignación (activa o inactiva)
   */
  static async exists(usuarioId: number, perfilId: number): Promise<boolean> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM usuario_perfiles WHERE usuario_id = ? AND perfil_id = ?',
      [usuarioId, perfilId]
    );

    return rows.length > 0;
  }

  /**
   * Verificar si existe una asignación activa
   */
  static async isActive(usuarioId: number, perfilId: number): Promise<boolean> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM usuario_perfiles WHERE usuario_id = ? AND perfil_id = ? AND activo = 1',
      [usuarioId, perfilId]
    );

    return rows.length > 0;
  }

  /**
   * Asignar perfil a usuario (o reactivar si existe inactivo)
   */
  static async assign(
    usuarioId: number,
    perfilId: number,
    auditoria: AuditoriaContext
  ): Promise<{ created: boolean; reactivated: boolean }> {
    const pool = getPool('local');

    // Validar que usuario existe y está activo
    const [usuarios] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE id = ? AND activo = 1',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    // Validar que perfil existe y está activo
    const [perfiles] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM perfiles WHERE id = ? AND activo = 1',
      [perfilId]
    );

    if (perfiles.length === 0) {
      throw new Error('Perfil no encontrado o inactivo');
    }

    // Verificar si ya existe la asignación
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT activo FROM usuario_perfiles WHERE usuario_id = ? AND perfil_id = ?',
      [usuarioId, perfilId]
    );

    let created = false;
    let reactivated = false;

    if (existing.length === 0) {
      // Crear nueva asignación
      await pool.query(
        `INSERT INTO usuario_perfiles (
          usuario_id, perfil_id, activo, assigned_at, assigned_by, assigned_ip,
          created_at, updated_at
        ) VALUES (?, ?, 1, NOW(), ?, ?, NOW(), NOW())`,
        [usuarioId, perfilId, auditoria.usuario_id, auditoria.ip]
      );

      created = true;

      console.log(
        `USUARIO-PERFIL: Asignado perfil_id=${perfilId} a usuario_id=${usuarioId}`
      );

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'usuario_perfiles',
        registro_id: usuarioId, // Usamos usuario_id como identificador
        accion: 'CREATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_nuevos: { usuario_id: usuarioId, perfil_id: perfilId, activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    } else if (!existing[0].activo) {
      // Reactivar asignación existente
      await pool.query(
        `UPDATE usuario_perfiles 
         SET activo = 1,
             assigned_at = NOW(),
             assigned_by = ?,
             assigned_ip = ?,
             removed_at = NULL,
             removed_by = NULL,
             removed_ip = NULL,
             updated_at = NOW()
         WHERE usuario_id = ? AND perfil_id = ?`,
        [auditoria.usuario_id, auditoria.ip, usuarioId, perfilId]
      );

      reactivated = true;

      console.log(
        `USUARIO-PERFIL: Reactivado perfil_id=${perfilId} para usuario_id=${usuarioId}`
      );

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'usuario_perfiles',
        registro_id: usuarioId,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: false },
        datos_nuevos: { activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    } else {
      throw new Error('El perfil ya está asignado al usuario');
    }

    return { created, reactivated };
  }

  /**
   * Remover perfil de usuario (soft delete)
   */
  static async remove(
    usuarioId: number,
    perfilId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Verificar que existe y está activo
    const isActive = await this.isActive(usuarioId, perfilId);
    if (!isActive) {
      throw new Error('La asignación no existe o ya está inactiva');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE usuario_perfiles
       SET activo = 0,
           removed_at = NOW(),
           removed_by = ?,
           removed_ip = ?,
           updated_at = NOW()
       WHERE usuario_id = ? AND perfil_id = ?`,
      [auditoria.usuario_id, auditoria.ip, usuarioId, perfilId]
    );

    console.log(
      `USUARIO-PERFIL: Removido perfil_id=${perfilId} de usuario_id=${usuarioId}`
    );

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'usuario_perfiles',
        registro_id: usuarioId,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: true },
        datos_nuevos: { activo: false },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente la asignación (hard delete)
   */
  static async delete(
    usuarioId: number,
    perfilId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Obtener datos antes de eliminar
    const [asignaciones] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM usuario_perfiles WHERE usuario_id = ? AND perfil_id = ?',
      [usuarioId, perfilId]
    );

    if (asignaciones.length === 0) {
      throw new Error('La asignación no existe');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM usuario_perfiles WHERE usuario_id = ? AND perfil_id = ?',
      [usuarioId, perfilId]
    );

    console.log(
      `USUARIO-PERFIL: Eliminado permanentemente perfil_id=${perfilId} de usuario_id=${usuarioId}`
    );

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'usuario_perfiles',
        registro_id: usuarioId,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: asignaciones[0],
        datos_nuevos: null,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Sincronizar perfiles de un usuario (reemplazar todos)
   */
  static async syncPerfiles(
    usuarioId: number,
    perfilIds: number[],
    auditoria: AuditoriaContext
  ): Promise<void> {
    const pool = getPool('local');

    // Obtener perfiles actuales activos
    const perfilesActuales = await this.getPerfilesByUsuario(usuarioId);
    const perfilesActualesIds = perfilesActuales.map(p => p.perfil_id);

    // Perfiles a agregar (nuevos)
    const perfilesToAdd = perfilIds.filter(id => !perfilesActualesIds.includes(id));

    // Perfiles a mantener (ya existen)
    const perfilesToKeep = perfilIds.filter(id => perfilesActualesIds.includes(id));

    // Perfiles a remover (ya no están en la lista)
    const perfilesToRemove = perfilesActualesIds.filter(id => !perfilIds.includes(id));

    // Agregar nuevos
    for (const perfilId of perfilesToAdd) {
      await this.assign(usuarioId, perfilId, auditoria);
    }

    // Remover los que ya no están
    for (const perfilId of perfilesToRemove) {
      await this.remove(usuarioId, perfilId, auditoria);
    }

    console.log(
      `USUARIO-PERFIL: Sincronizado usuario_id=${usuarioId} - Agregados: ${perfilesToAdd.length}, Mantenidos: ${perfilesToKeep.length}, Removidos: ${perfilesToRemove.length}`
    );
  }

  /**
   * Obtener historial de auditoría de un usuario
   */
  static async getHistorialByUsuario(usuarioId: number) {
    return AuditoriaService.getHistorial('usuario_perfiles', usuarioId);
  }

  /**
   * Obtener historial de auditoría de un perfil
   */
  static async getHistorialByPerfil(perfilId: number) {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM auditoria 
       WHERE tabla = 'usuario_perfiles' 
       AND JSON_EXTRACT(datos_nuevos, '$.perfil_id') = ?
       ORDER BY created_at DESC`,
      [perfilId]
    );

    return rows;
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToUsuarioPerfil(row: any): UsuarioPerfilDetallado {
    return {
      usuario_id: row.usuario_id,
      perfil_id: row.perfil_id,
      activo: !!row.activo,
      assigned_at: row.assigned_at,
      assigned_by: row.assigned_by,
      assigned_ip: row.assigned_ip,
      removed_at: row.removed_at,
      removed_by: row.removed_by,
      removed_ip: row.removed_ip,
      created_at: row.created_at,
      updated_at: row.updated_at,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      perfil_nombre: row.perfil_nombre,
      perfil_descripcion: row.perfil_descripcion,
      assigned_by_nombre: row.assigned_by_nombre,
      removed_by_nombre: row.removed_by_nombre
    };
  }

  // ========== MÉTODOS DE COMPATIBILIDAD (para no romper código existente) ==========

  /**
   * @deprecated Use getAll() instead
   */
  static async listarTodos(): Promise<any[]> {
    return this.getAll();
  }

  /**
   * @deprecated Use getPerfilesByUsuario() instead
   */
  static async listarPorUsuario(usuarioId: number): Promise<any[]> {
    return this.getPerfilesByUsuario(usuarioId);
  }

  /**
   * @deprecated Use assign() instead
   */
  static async asignarPerfil(
    usuarioId: number,
    perfilId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.assign(usuarioId, perfilId, {
        usuario_id: 1,
        usuario_nombre: 'system'
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * @deprecated Use remove() instead
   */
  static async quitarPerfil(
    usuarioId: number,
    perfilId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.remove(usuarioId, perfilId, {
        usuario_id: 1,
        usuario_nombre: 'system'
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Para uso en transacciones del modelo Usuario
   */
  static async syncPerfilesConn(
    conn: any,
    usuarioId: number,
    perfiles: number[]
  ): Promise<void> {
    await conn.query('DELETE FROM usuario_perfiles WHERE usuario_id = ?', [usuarioId]);
    if (perfiles.length) {
      const values = perfiles.map(pId => [usuarioId, pId, new Date()]);
      await conn.query(
        'INSERT INTO usuario_perfiles (usuario_id, perfil_id, assigned_at) VALUES ?',
        [values]
      );
    }
  }
}