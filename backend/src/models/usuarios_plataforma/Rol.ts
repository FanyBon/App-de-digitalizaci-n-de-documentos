// src/models/usuarios_plataforma/Rol.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface RolData {
  id?: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  es_sistema?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface RolDetallado extends RolData {
  total_usuarios?: number;
  usuarios_activos?: number;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Rol {
  /**
   * Listar todos los roles con filtros
   */
  static async getAll(filters?: {
    activo?: boolean;
    es_sistema?: boolean;
  }): Promise<RolDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.activo,
        r.es_sistema,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM usuario_roles ur WHERE ur.rol_id = r.id) AS total_usuarios,
        (SELECT COUNT(*) FROM usuario_roles ur 
         INNER JOIN usuarios u ON ur.usuario_id = u.id 
         WHERE ur.rol_id = r.id AND u.activo = 1) AS usuarios_activos
      FROM roles r
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.activo !== undefined) {
      query += ' AND r.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    if (filters?.es_sistema !== undefined) {
      query += ' AND r.es_sistema = ?';
      params.push(filters.es_sistema ? 1 : 0);
    }

    query += ' ORDER BY r.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToRol(row));
  }

  /**
   * Obtener rol por ID
   */
  static async getById(id: number): Promise<RolDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.activo,
        r.es_sistema,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM usuario_roles ur WHERE ur.rol_id = r.id) AS total_usuarios,
        (SELECT COUNT(*) FROM usuario_roles ur 
         INNER JOIN usuarios u ON ur.usuario_id = u.id 
         WHERE ur.rol_id = r.id AND u.activo = 1) AS usuarios_activos
      FROM roles r
      WHERE r.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToRol(rows[0]);
  }

  /**
   * Obtener rol por nombre
   */
  static async getByNombre(nombre: string): Promise<RolDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.activo,
        r.es_sistema,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*) FROM usuario_roles ur WHERE ur.rol_id = r.id) AS total_usuarios,
        (SELECT COUNT(*) FROM usuario_roles ur 
         INNER JOIN usuarios u ON ur.usuario_id = u.id 
         WHERE ur.rol_id = r.id AND u.activo = 1) AS usuarios_activos
      FROM roles r
      WHERE r.nombre = ?
      `,
      [nombre]
    );

    if (rows.length === 0) return null;

    return this.mapRowToRol(rows[0]);
  }

  /**
   * Crear nuevo rol
   */
  static async create(data: RolData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // Validar que el nombre no esté duplicado
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM roles WHERE nombre = ?',
      [data.nombre]
    );

    if (existente.length > 0) {
      throw new Error('Ya existe un rol con ese nombre');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO roles (
        nombre, descripcion, activo, es_sistema, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `,
      [
        data.nombre,
        data.descripcion || '',
        data.activo !== false ? 1 : 0,
        data.es_sistema ? 1 : 0
      ]
    );

    const rolId = result.insertId;

    console.log(`ROL: Creado rol_id=${rolId} nombre="${data.nombre}"`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'roles',
      registro_id: rolId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: data,
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return rolId;
  }

  /**
   * Actualizar rol
   */
  static async update(
    id: number,
    data: Partial<RolData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Obtener estado anterior
    const rolAnterior = await this.getById(id);
    if (!rolAnterior) {
      throw new Error('Rol no encontrado');
    }

    // Si es rol del sistema, no permitir cambiar el nombre
    if (rolAnterior.es_sistema && data.nombre && data.nombre !== rolAnterior.nombre) {
      throw new Error('No se puede cambiar el nombre de un rol del sistema');
    }

    // Validar nombre duplicado
    if (data.nombre && data.nombre !== rolAnterior.nombre) {
      const [existente] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM roles WHERE nombre = ? AND id != ?',
        [data.nombre, id]
      );

      if (existente.length > 0) {
        throw new Error('Ya existe un rol con ese nombre');
      }
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      updates.push('descripcion = ?');
      params.push(data.descripcion);
    }
    if (data.activo !== undefined) {
      updates.push('activo = ?');
      params.push(data.activo ? 1 : 0);
    }

    if (updates.length === 0) {
      return false;
    }

    params.push(id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE roles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    console.log(`ROL: Actualizado rol_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'roles',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: {
          nombre: rolAnterior.nombre,
          descripcion: rolAnterior.descripcion,
          activo: rolAnterior.activo
        },
        datos_nuevos: data,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Cambiar estado (soft delete)
   */
  static async changeStatus(
    id: number,
    activo: boolean,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    const rolAnterior = await this.getById(id);
    if (!rolAnterior) {
      throw new Error('Rol no encontrado');
    }

    if (rolAnterior.activo === activo) {
      throw new Error(`El rol ya está ${activo ? 'activo' : 'inactivo'}`);
    }

    // No permitir inactivar roles del sistema que están en uso
    if (!activo && rolAnterior.es_sistema && rolAnterior.usuarios_activos! > 0) {
      throw new Error(
        `No se puede inactivar el rol "${rolAnterior.nombre}" del sistema: tiene ${rolAnterior.usuarios_activos} usuario(s) activo(s)`
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE roles SET activo = ?, updated_at = NOW() WHERE id = ?',
      [activo ? 1 : 0, id]
    );

    console.log(`ROL: Cambio estado rol_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'roles',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: rolAnterior.activo },
        datos_nuevos: { activo },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente (solo roles personalizados sin usuarios)
   */
  static async delete(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const rol = await this.getById(id);
    if (!rol) {
      throw new Error('Rol no encontrado');
    }

    // No permitir eliminar roles del sistema
    if (rol.es_sistema) {
      throw new Error(`No se puede eliminar el rol "${rol.nombre}" porque es parte del sistema`);
    }

    // Validar que no tenga usuarios asignados
    if (rol.total_usuarios! > 0) {
      throw new Error(`No se puede eliminar: tiene ${rol.total_usuarios} usuario(s) asignado(s)`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM roles WHERE id = ?',
      [id]
    );

    console.log(`ROL: Eliminado rol_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'roles',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: rol,
        datos_nuevos: null,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Obtener historial de auditoría
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('roles', id);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToRol(row: any): RolDetallado {
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      activo: !!row.activo,
      es_sistema: !!row.es_sistema,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_usuarios: row.total_usuarios,
      usuarios_activos: row.usuarios_activos
    };
  }

  // ========== MÉTODOS DE COMPATIBILIDAD (para no romper código existente) ==========

  /**
   * @deprecated Use getAll() instead
   */
  static async listar(): Promise<RolData[]> {
    return this.getAll();
  }

  /**
   * @deprecated Use getById() instead
   */
  static async obtenerPorId(id: number): Promise<RolData | null> {
    return this.getById(id);
  }

  /**
   * @deprecated Use create() instead
   */
  static async crear(nombre: string): Promise<RolData> {
    const rolId = await this.create(
      { nombre },
      { usuario_id: 1, usuario_nombre: 'system' }
    );
    const rol = await this.getById(rolId);
    return rol as RolData;
  }

  /**
   * @deprecated Use update() instead
   */
  static async editar(id: number, nombre: string): Promise<boolean> {
    return this.update(
      id,
      { nombre },
      { usuario_id: 1, usuario_nombre: 'system' }
    );
  }

  /**
   * @deprecated Use delete() instead
   */
  static async eliminar(id: number): Promise<boolean> {
    return this.delete(id, { usuario_id: 1, usuario_nombre: 'system' });
  }
}