// src/models/permisos/RolPermiso.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface RolPermisoData {
  rol_id: number;
  permiso_id: number;
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

export interface RolPermisoDetallado extends RolPermisoData {
  rol_nombre?: string;
  permiso_codigo?: string;
  permiso_nombre?: string;
  permiso_modulo?: string;
  permiso_accion?: string;
  assigned_by_nombre?: string;
  removed_by_nombre?: string;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class RolPermiso {
  /**
   * Listar todas las asignaciones con filtros
   */
  static async getAll(filters?: {
    rol_id?: number;
    permiso_id?: number;
    activo?: boolean;
  }): Promise<RolPermisoDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        rp.rol_id,
        rp.permiso_id,
        rp.activo,
        rp.assigned_at,
        rp.assigned_by,
        rp.assigned_ip,
        rp.removed_at,
        rp.removed_by,
        rp.removed_ip,
        rp.created_at,
        rp.updated_at,
        r.nombre AS rol_nombre,
        p.codigo AS permiso_codigo,
        p.nombre AS permiso_nombre,
        p.modulo AS permiso_modulo,
        p.accion AS permiso_accion,
        ua.nombre_usuario AS assigned_by_nombre,
        ur.nombre_usuario AS removed_by_nombre
      FROM rol_permisos rp
      INNER JOIN roles r ON rp.rol_id = r.id
      INNER JOIN permisos p ON rp.permiso_id = p.id
      LEFT JOIN usuarios ua ON rp.assigned_by = ua.id
      LEFT JOIN usuarios ur ON rp.removed_by = ur.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.rol_id !== undefined) {
      query += ' AND rp.rol_id = ?';
      params.push(filters.rol_id);
    }

    if (filters?.permiso_id !== undefined) {
      query += ' AND rp.permiso_id = ?';
      params.push(filters.permiso_id);
    }

    if (filters?.activo !== undefined) {
      query += ' AND rp.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    query += ' ORDER BY rp.assigned_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToRolPermiso(row));
  }

  /**
   * Listar permisos activos de un rol
   */
  static async getPermisosByRol(rolId: number): Promise<RolPermisoDetallado[]> {
    return this.getAll({ rol_id: rolId, activo: true });
  }

  /**
   * Listar roles activos que tienen un permiso
   */
  static async getRolesByPermiso(permisoId: number): Promise<RolPermisoDetallado[]> {
    return this.getAll({ permiso_id: permisoId, activo: true });
  }

  /**
   * Verificar si un rol tiene un permiso específico
   */
  static async hasPermiso(rolId: number, permisoCodigo: string): Promise<boolean> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 
       FROM rol_permisos rp
       INNER JOIN permisos p ON rp.permiso_id = p.id
       WHERE rp.rol_id = ? 
         AND p.codigo = ? 
         AND rp.activo = 1 
         AND p.activo = 1`,
      [rolId, permisoCodigo]
    );

    return rows.length > 0;
  }

  /**
   * Asignar permiso a rol (o reactivar si existe inactivo)
   */
  static async assign(
    rolId: number,
    permisoId: number,
    auditoria: AuditoriaContext
  ): Promise<{ created: boolean; reactivated: boolean }> {
    const pool = getPool('local');

    // Validar que rol existe y está activo
    const [roles] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM roles WHERE id = ? AND activo = 1',
      [rolId]
    );

    if (roles.length === 0) {
      throw new Error('Rol no encontrado o inactivo');
    }

    // Validar que permiso existe y está activo
    const [permisos] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM permisos WHERE id = ? AND activo = 1',
      [permisoId]
    );

    if (permisos.length === 0) {
      throw new Error('Permiso no encontrado o inactivo');
    }

    // Verificar si ya existe la asignación
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT activo FROM rol_permisos WHERE rol_id = ? AND permiso_id = ?',
      [rolId, permisoId]
    );

    let created = false;
    let reactivated = false;

    if (existing.length === 0) {
      // Crear nueva asignación
      await pool.query(
        `INSERT INTO rol_permisos (
          rol_id, permiso_id, activo, assigned_at, assigned_by, assigned_ip,
          created_at, updated_at
        ) VALUES (?, ?, 1, NOW(), ?, ?, NOW(), NOW())`,
        [rolId, permisoId, auditoria.usuario_id, auditoria.ip]
      );

      created = true;

      console.log(`ROL-PERMISO: Asignado permiso_id=${permisoId} a rol_id=${rolId}`);

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'rol_permisos',
        registro_id: rolId,
        accion: 'CREATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_nuevos: { rol_id: rolId, permiso_id: permisoId, activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    } else if (!existing[0].activo) {
      // Reactivar asignación existente
      await pool.query(
        `UPDATE rol_permisos 
         SET activo = 1,
             assigned_at = NOW(),
             assigned_by = ?,
             assigned_ip = ?,
             removed_at = NULL,
             removed_by = NULL,
             removed_ip = NULL,
             updated_at = NOW()
         WHERE rol_id = ? AND permiso_id = ?`,
        [auditoria.usuario_id, auditoria.ip, rolId, permisoId]
      );

      reactivated = true;

      console.log(`ROL-PERMISO: Reactivado permiso_id=${permisoId} para rol_id=${rolId}`);

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'rol_permisos',
        registro_id: rolId,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: false },
        datos_nuevos: { activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    } else {
      throw new Error('El permiso ya está asignado al rol');
    }

    return { created, reactivated };
  }

  /**
   * Remover permiso de rol (soft delete)
   */
  static async remove(
    rolId: number,
    permisoId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Verificar que existe y está activo
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM rol_permisos WHERE rol_id = ? AND permiso_id = ? AND activo = 1',
      [rolId, permisoId]
    );

    if (existing.length === 0) {
      throw new Error('La asignación no existe o ya está inactiva');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE rol_permisos
       SET activo = 0,
           removed_at = NOW(),
           removed_by = ?,
           removed_ip = ?,
           updated_at = NOW()
       WHERE rol_id = ? AND permiso_id = ?`,
      [auditoria.usuario_id, auditoria.ip, rolId, permisoId]
    );

    console.log(`ROL-PERMISO: Removido permiso_id=${permisoId} de rol_id=${rolId}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'rol_permisos',
        registro_id: rolId,
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
   * Sincronizar permisos de un rol (reemplazar todos)
   */
  static async syncPermisos(
    rolId: number,
    permisoIds: number[],
    auditoria: AuditoriaContext
  ): Promise<void> {
    const pool = getPool('local');

    // Obtener permisos actuales activos
    const permisosActuales = await this.getPermisosByRol(rolId);
    const permisosActualesIds = permisosActuales.map(p => p.permiso_id);

    // Permisos a agregar (nuevos)
    const permisosToAdd = permisoIds.filter(id => !permisosActualesIds.includes(id));

    // Permisos a remover (ya no están en la lista)
    const permisosToRemove = permisosActualesIds.filter(id => !permisoIds.includes(id));

    // Agregar nuevos
    for (const permisoId of permisosToAdd) {
      await this.assign(rolId, permisoId, auditoria);
    }

    // Remover los que ya no están
    for (const permisoId of permisosToRemove) {
      await this.remove(rolId, permisoId, auditoria);
    }

    console.log(
      `ROL-PERMISO: Sincronizado rol_id=${rolId} - Agregados: ${permisosToAdd.length}, Removidos: ${permisosToRemove.length}`
    );
  }

  /**
   * Obtener historial de auditoría de un rol
   */
  static async getHistorialByRol(rolId: number) {
    return AuditoriaService.getHistorial('rol_permisos', rolId);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToRolPermiso(row: any): RolPermisoDetallado {
    return {
      rol_id: row.rol_id,
      permiso_id: row.permiso_id,
      activo: !!row.activo,
      assigned_at: row.assigned_at,
      assigned_by: row.assigned_by,
      assigned_ip: row.assigned_ip,
      removed_at: row.removed_at,
      removed_by: row.removed_by,
      removed_ip: row.removed_ip,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rol_nombre: row.rol_nombre,
      permiso_codigo: row.permiso_codigo,
      permiso_nombre: row.permiso_nombre,
      permiso_modulo: row.permiso_modulo,
      permiso_accion: row.permiso_accion,
      assigned_by_nombre: row.assigned_by_nombre,
      removed_by_nombre: row.removed_by_nombre
    };
  }
}