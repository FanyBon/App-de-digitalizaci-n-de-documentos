// src/models/permisos/Permiso.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface PermisoData {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
  accion: string;
  metodo?: string;
  ruta?: string;
  es_sistema?: boolean;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Permiso {
  /**
   * Listar todos los permisos con filtros
   */
  static async getAll(filters?: {
    modulo?: string;
    activo?: boolean;
    es_sistema?: boolean;
  }): Promise<PermisoData[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        id,
        codigo,
        nombre,
        descripcion,
        modulo,
        accion,
        metodo,
        ruta,
        es_sistema,
        activo,
        created_at,
        updated_at
      FROM permisos
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.modulo) {
      query += ' AND modulo = ?';
      params.push(filters.modulo);
    }

    if (filters?.activo !== undefined) {
      query += ' AND activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    if (filters?.es_sistema !== undefined) {
      query += ' AND es_sistema = ?';
      params.push(filters.es_sistema ? 1 : 0);
    }

    query += ' ORDER BY modulo, accion';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToPermiso(row));
  }

  /**
   * Obtener permiso por ID
   */
  static async getById(id: number): Promise<PermisoData | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM permisos WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToPermiso(rows[0]);
  }

  /**
   * Obtener permiso por código
   */
  static async getByCodigo(codigo: string): Promise<PermisoData | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM permisos WHERE codigo = ?`,
      [codigo]
    );

    if (rows.length === 0) return null;

    return this.mapRowToPermiso(rows[0]);
  }

  /**
   * Obtener módulos únicos
   */
  static async getModulos(): Promise<string[]> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT modulo FROM permisos WHERE activo = 1 ORDER BY modulo`
    );

    return rows.map(row => row.modulo);
  }

  /**
   * Crear nuevo permiso
   */
  static async create(data: PermisoData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // Validar que el código no esté duplicado
    const existente = await this.getByCodigo(data.codigo);
    if (existente) {
      throw new Error('Ya existe un permiso con ese código');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO permisos (
        codigo, nombre, descripcion, modulo, accion, metodo, ruta, 
        es_sistema, activo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.codigo,
        data.nombre,
        data.descripcion || '',
        data.modulo,
        data.accion,
        data.metodo || null,
        data.ruta || null,
        data.es_sistema ? 1 : 0,
        data.activo !== false ? 1 : 0
      ]
    );

    const permisoId = result.insertId;

    console.log(`PERMISO: Creado permiso_id=${permisoId} codigo="${data.codigo}"`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'permisos',
      registro_id: permisoId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: data,
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return permisoId;
  }

  /**
   * Actualizar permiso
   */
  static async update(
    id: number,
    data: Partial<PermisoData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Obtener estado anterior
    const permisoAnterior = await this.getById(id);
    if (!permisoAnterior) {
      throw new Error('Permiso no encontrado');
    }

    // Si es permiso del sistema, no permitir cambiar el código
    if (permisoAnterior.es_sistema && data.codigo && data.codigo !== permisoAnterior.codigo) {
      throw new Error('No se puede cambiar el código de un permiso del sistema');
    }

    // Validar código duplicado
    if (data.codigo && data.codigo !== permisoAnterior.codigo) {
      const existente = await this.getByCodigo(data.codigo);
      if (existente) {
        throw new Error('Ya existe un permiso con ese código');
      }
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (data.codigo !== undefined) {
      updates.push('codigo = ?');
      params.push(data.codigo);
    }
    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      updates.push('descripcion = ?');
      params.push(data.descripcion);
    }
    if (data.modulo !== undefined) {
      updates.push('modulo = ?');
      params.push(data.modulo);
    }
    if (data.accion !== undefined) {
      updates.push('accion = ?');
      params.push(data.accion);
    }
    if (data.metodo !== undefined) {
      updates.push('metodo = ?');
      params.push(data.metodo);
    }
    if (data.ruta !== undefined) {
      updates.push('ruta = ?');
      params.push(data.ruta);
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
      `UPDATE permisos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    console.log(`PERMISO: Actualizado permiso_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'permisos',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: permisoAnterior,
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

    const permisoAnterior = await this.getById(id);
    if (!permisoAnterior) {
      throw new Error('Permiso no encontrado');
    }

    if (permisoAnterior.activo === activo) {
      throw new Error(`El permiso ya está ${activo ? 'activo' : 'inactivo'}`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE permisos SET activo = ?, updated_at = NOW() WHERE id = ?',
      [activo ? 1 : 0, id]
    );

    console.log(`PERMISO: Cambio estado permiso_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'permisos',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: permisoAnterior.activo },
        datos_nuevos: { activo },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente (solo permisos personalizados)
   */
  static async delete(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const permiso = await this.getById(id);
    if (!permiso) {
      throw new Error('Permiso no encontrado');
    }

    // No permitir eliminar permisos del sistema
    if (permiso.es_sistema) {
      throw new Error(`No se puede eliminar el permiso "${permiso.nombre}" porque es parte del sistema`);
    }

    // Verificar que no esté asignado a ningún rol
    const [asignaciones] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM rol_permisos WHERE permiso_id = ? AND activo = 1',
      [id]
    );

    if (asignaciones[0].total > 0) {
      throw new Error(`No se puede eliminar: tiene ${asignaciones[0].total} asignación(es) activa(s)`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM permisos WHERE id = ?',
      [id]
    );

    console.log(`PERMISO: Eliminado permiso_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'permisos',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: permiso,
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
    return AuditoriaService.getHistorial('permisos', id);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToPermiso(row: any): PermisoData {
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      modulo: row.modulo,
      accion: row.accion,
      metodo: row.metodo,
      ruta: row.ruta,
      es_sistema: !!row.es_sistema,
      activo: !!row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}