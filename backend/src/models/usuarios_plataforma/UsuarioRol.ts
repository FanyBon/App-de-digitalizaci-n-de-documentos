// src/models/usuarios_plataforma/UsuarioRol.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UsuarioRolData {
  usuario_id: number;
  rol_id: number;
  assigned_at?: Date;
  activo?: boolean;
  assigned_by?: number;
  assigned_ip?: string;
  removed_at?: Date | null;
  removed_by?: number | null;
  removed_ip?: string | null;
  updated_at?: Date;
}

export interface UsuarioRolDetallado extends UsuarioRolData {
  usuario_nombre?: string;
  usuario_email?: string;
  rol_nombre?: string;
  rol_descripcion?: string;
  asignado_por_nombre?: string;
  removido_por_nombre?: string;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class UsuarioRol {
  /**
   * Listar roles activos de un usuario
   */
  static async listarRoles(usuarioId: number, incluirInactivos: boolean = false): Promise<UsuarioRolDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        ur.usuario_id,
        ur.rol_id,
        ur.assigned_at,
        ur.activo,
        ur.assigned_by,
        ur.assigned_ip,
        ur.removed_at,
        ur.removed_by,
        ur.removed_ip,
        ur.updated_at,
        u.nombre_usuario as usuario_nombre,
        u.email as usuario_email,
        r.nombre as rol_nombre,
        r.descripcion as rol_descripcion,
        ua.nombre_usuario as asignado_por_nombre,
        ur_removed.nombre_usuario as removido_por_nombre
      FROM usuario_roles ur
      INNER JOIN usuarios u ON ur.usuario_id = u.id
      INNER JOIN roles r ON ur.rol_id = r.id
      LEFT JOIN usuarios ua ON ur.assigned_by = ua.id
      LEFT JOIN usuarios ur_removed ON ur.removed_by = ur_removed.id
      WHERE ur.usuario_id = ?
    `;

    const params: any[] = [usuarioId];

    if (!incluirInactivos) {
      query += ' AND ur.activo = 1';
    }

    query += ' ORDER BY ur.assigned_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToUsuarioRol(row));
  }

  /**
   * Verificar si un usuario tiene un rol específico
   */
  static async tieneRol(usuarioId: number, rolId: number): Promise<boolean> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM usuario_roles WHERE usuario_id = ? AND rol_id = ? AND activo = 1',
      [usuarioId, rolId]
    );

    return rows.length > 0;
  }

  /**
   * Asignar un rol a un usuario
   */
  static async asignarRol(
    usuarioId: number,
    rolId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Validar que el usuario exista
    const [usuarioRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, nombre_usuario FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarioRows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Validar que el rol exista y esté activo
    const [rolRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre FROM roles WHERE id = ? AND activo = 1',
      [rolId]
    );

    if (rolRows.length === 0) {
      throw new Error('Rol no encontrado o inactivo');
    }

    // Verificar si ya existe la asignación
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT activo FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?',
      [usuarioId, rolId]
    );

    if (existente.length > 0) {
      if (existente[0].activo === 1) {
        throw new Error('El usuario ya tiene este rol asignado');
      } else {
        // Reactivar el rol
        await pool.query(
          `UPDATE usuario_roles 
           SET activo = 1, 
               assigned_at = NOW(),
               assigned_by = ?,
               assigned_ip = ?,
               removed_at = NULL,
               removed_by = NULL,
               removed_ip = NULL,
               updated_at = NOW()
           WHERE usuario_id = ? AND rol_id = ?`,
          [auditoria.usuario_id, auditoria.ip, usuarioId, rolId]
        );

        console.log(`USUARIO_ROL: Reactivado rol_id=${rolId} para usuario_id=${usuarioId}`);
        return true;
      }
    }

    // Crear nueva asignación
    await pool.query(
      `INSERT INTO usuario_roles 
       (usuario_id, rol_id, assigned_at, activo, assigned_by, assigned_ip, updated_at) 
       VALUES (?, ?, NOW(), 1, ?, ?, NOW())`,
      [usuarioId, rolId, auditoria.usuario_id, auditoria.ip]
    );

    console.log(`USUARIO_ROL: Asignado rol_id=${rolId} a usuario_id=${usuarioId} por usuario_id=${auditoria.usuario_id}`);

    return true;
  }

  /**
   * Quitar un rol de un usuario (soft delete)
   */
  static async quitarRol(
    usuarioId: number,
    rolId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Validar que el usuario exista
    const [usuarioRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarioRows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Validar que el rol exista
    const [rolRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM roles WHERE id = ?',
      [rolId]
    );

    if (rolRows.length === 0) {
      throw new Error('Rol no encontrado');
    }

    // Verificar que el usuario tenga el rol asignado y activo
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT activo FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?',
      [usuarioId, rolId]
    );

    if (existente.length === 0) {
      throw new Error('El usuario no tiene este rol asignado');
    }

    if (existente[0].activo === 0) {
      throw new Error('El rol ya está inactivo para este usuario');
    }

    // Soft delete: marcar como inactivo y registrar quién lo removió
    await pool.query(
      `UPDATE usuario_roles 
       SET activo = 0,
           removed_at = NOW(),
           removed_by = ?,
           removed_ip = ?,
           updated_at = NOW()
       WHERE usuario_id = ? AND rol_id = ?`,
      [auditoria.usuario_id, auditoria.ip, usuarioId, rolId]
    );

    console.log(`USUARIO_ROL: Removido rol_id=${rolId} de usuario_id=${usuarioId} por usuario_id=${auditoria.usuario_id}`);

    return true;
  }

  /**
   * Eliminar físicamente un rol de un usuario (hard delete)
   */
  static async eliminarRol(
    usuarioId: number,
    rolId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Validar que exista la asignación
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?',
      [usuarioId, rolId]
    );

    if (existente.length === 0) {
      throw new Error('La asignación no existe');
    }

    // Eliminar físicamente
    await pool.query(
      'DELETE FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?',
      [usuarioId, rolId]
    );

    console.log(`USUARIO_ROL: Eliminado físicamente rol_id=${rolId} de usuario_id=${usuarioId} por usuario_id=${auditoria.usuario_id}`);

    return true;
  }

  /**
   * Reemplazar todos los roles de un usuario
   */
  static async reemplazarRoles(
    usuarioId: number,
    nuevosRoles: number[],
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Validar que el usuario exista
    const [usuarioRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarioRows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Validar que todos los roles existan y estén activos
    if (nuevosRoles.length > 0) {
      const [rolesRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM roles WHERE id IN (?) AND activo = 1',
        [nuevosRoles]
      );

      if (rolesRows.length !== nuevosRoles.length) {
        throw new Error('Uno o más roles no existen o están inactivos');
      }
    }

    // Obtener roles actuales activos
    const rolesActuales = await this.listarRoles(usuarioId, false);
    const rolesActualesIds = rolesActuales.map(r => r.rol_id);

    // Determinar qué roles agregar y cuáles quitar
    const rolesAgregar = nuevosRoles.filter(id => !rolesActualesIds.includes(id));
    const rolesQuitar = rolesActualesIds.filter(id => !nuevosRoles.includes(id));

    // Quitar roles que ya no deben estar
    for (const rolId of rolesQuitar) {
      await this.quitarRol(usuarioId, rolId, auditoria);
    }

    // Agregar nuevos roles
    for (const rolId of rolesAgregar) {
      await this.asignarRol(usuarioId, rolId, auditoria);
    }

    console.log(`USUARIO_ROL: Reemplazados roles de usuario_id=${usuarioId} por usuario_id=${auditoria.usuario_id}`);

    return true;
  }

  /**
   * Obtener historial completo de asignaciones de un usuario (incluyendo inactivos)
   */
  static async obtenerHistorial(usuarioId: number): Promise<UsuarioRolDetallado[]> {
    return this.listarRoles(usuarioId, true);
  }

  /**
   * Sincronizar roles usando una conexión externa (para transacciones en Usuario)
   */
  static async syncRolesConn(
    conn: any, 
    usuarioId: number, 
    roles: number[], 
    auditoriaUsuarioId: number, 
    auditoriaIp: string
  ): Promise<void> {
    // Marcar todos los roles actuales como inactivos
    await conn.query(
      `UPDATE usuario_roles 
       SET activo = 0, 
           removed_at = NOW(), 
           removed_by = ?, 
           removed_ip = ?,
           updated_at = NOW()
       WHERE usuario_id = ? AND activo = 1`,
      [auditoriaUsuarioId, auditoriaIp, usuarioId]
    );

    // Asignar los nuevos roles
    if (roles.length > 0) {
      for (const rolId of roles) {
        // Verificar si ya existe
        const [existente]: any = await conn.query(
          'SELECT activo FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?',
          [usuarioId, rolId]
        );

        if (existente.length > 0 && existente[0].activo === 0) {
          // Reactivar
          await conn.query(
            `UPDATE usuario_roles 
             SET activo = 1,
                 assigned_at = NOW(),
                 assigned_by = ?,
                 assigned_ip = ?,
                 removed_at = NULL,
                 removed_by = NULL,
                 removed_ip = NULL,
                 updated_at = NOW()
             WHERE usuario_id = ? AND rol_id = ?`,
            [auditoriaUsuarioId, auditoriaIp, usuarioId, rolId]
          );
        } else if (existente.length === 0) {
          // Crear nuevo
          await conn.query(
            `INSERT INTO usuario_roles 
             (usuario_id, rol_id, assigned_at, activo, assigned_by, assigned_ip, updated_at) 
             VALUES (?, ?, NOW(), 1, ?, ?, NOW())`,
            [usuarioId, rolId, auditoriaUsuarioId, auditoriaIp]
          );
        }
      }
    }
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToUsuarioRol(row: any): UsuarioRolDetallado {
    return {
      usuario_id: row.usuario_id,
      rol_id: row.rol_id,
      assigned_at: row.assigned_at,
      activo: !!row.activo,
      assigned_by: row.assigned_by,
      assigned_ip: row.assigned_ip,
      removed_at: row.removed_at,
      removed_by: row.removed_by,
      removed_ip: row.removed_ip,
      updated_at: row.updated_at,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      rol_nombre: row.rol_nombre,
      rol_descripcion: row.rol_descripcion,
      asignado_por_nombre: row.asignado_por_nombre,
      removido_por_nombre: row.removido_por_nombre
    };
  }
}