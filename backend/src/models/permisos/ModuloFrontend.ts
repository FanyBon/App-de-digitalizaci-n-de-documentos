// src/models/permisos/ModuloFrontend.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface ModuloFrontendData {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  ruta?: string;
  padre_id?: number | null;
  orden?: number;
  es_sistema?: boolean;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ModuloFrontendDetallado extends ModuloFrontendData {
  padre_nombre?: string;
  total_hijos?: number;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class ModuloFrontend {
  /**
   * Listar todos los módulos con filtros
   */
  static async getAll(filters?: {
    activo?: boolean;
    es_sistema?: boolean;
    padre_id?: number | null;
  }): Promise<ModuloFrontendDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        m.id,
        m.codigo,
        m.nombre,
        m.descripcion,
        m.icono,
        m.ruta,
        m.padre_id,
        m.orden,
        m.es_sistema,
        m.activo,
        m.created_at,
        m.updated_at,
        p.nombre AS padre_nombre,
        (SELECT COUNT(*) FROM modulos_frontend WHERE padre_id = m.id) AS total_hijos
      FROM modulos_frontend m
      LEFT JOIN modulos_frontend p ON m.padre_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.activo !== undefined) {
      query += ' AND m.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    if (filters?.es_sistema !== undefined) {
      query += ' AND m.es_sistema = ?';
      params.push(filters.es_sistema ? 1 : 0);
    }

    if (filters?.padre_id !== undefined) {
      if (filters.padre_id === null) {
        query += ' AND m.padre_id IS NULL';
      } else {
        query += ' AND m.padre_id = ?';
        params.push(filters.padre_id);
      }
    }

    query += ' ORDER BY IFNULL(m.padre_id, m.id), m.orden, m.nombre';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToModulo(row));
  }

  /**
   * Obtener módulos principales (sin padre)
   */
  static async getPrincipales(): Promise<ModuloFrontendDetallado[]> {
    return this.getAll({ padre_id: null, activo: true });
  }

  /**
   * Obtener submódulos de un módulo padre
   */
  static async getHijos(padreId: number): Promise<ModuloFrontendDetallado[]> {
    return this.getAll({ padre_id: padreId, activo: true });
  }

  /**
   * Obtener módulo por ID
   */
  static async getById(id: number): Promise<ModuloFrontendDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        m.id,
        m.codigo,
        m.nombre,
        m.descripcion,
        m.icono,
        m.ruta,
        m.padre_id,
        m.orden,
        m.es_sistema,
        m.activo,
        m.created_at,
        m.updated_at,
        p.nombre AS padre_nombre,
        (SELECT COUNT(*) FROM modulos_frontend WHERE padre_id = m.id) AS total_hijos
      FROM modulos_frontend m
      LEFT JOIN modulos_frontend p ON m.padre_id = p.id
      WHERE m.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToModulo(rows[0]);
  }

  /**
   * Obtener módulo por código
   */
  static async getByCodigo(codigo: string): Promise<ModuloFrontendDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        m.id,
        m.codigo,
        m.nombre,
        m.descripcion,
        m.icono,
        m.ruta,
        m.padre_id,
        m.orden,
        m.es_sistema,
        m.activo,
        m.created_at,
        m.updated_at,
        p.nombre AS padre_nombre,
        (SELECT COUNT(*) FROM modulos_frontend WHERE padre_id = m.id) AS total_hijos
      FROM modulos_frontend m
      LEFT JOIN modulos_frontend p ON m.padre_id = p.id
      WHERE m.codigo = ?`,
      [codigo]
    );

    if (rows.length === 0) return null;

    return this.mapRowToModulo(rows[0]);
  }

  /**
   * Crear nuevo módulo
   */
  static async create(data: ModuloFrontendData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // Validar que el código no esté duplicado
    const existente = await this.getByCodigo(data.codigo);
    if (existente) {
      throw new Error('Ya existe un módulo con ese código');
    }

    // Validar que el padre existe si se especifica
    if (data.padre_id) {
      const padre = await this.getById(data.padre_id);
      if (!padre) {
        throw new Error('El módulo padre no existe');
      }
      if (!padre.activo) {
        throw new Error('El módulo padre está inactivo');
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO modulos_frontend (
        codigo, nombre, descripcion, icono, ruta, padre_id, orden, 
        es_sistema, activo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.codigo,
        data.nombre,
        data.descripcion || '',
        data.icono || null,
        data.ruta || null,
        data.padre_id || null,
        data.orden || 0,
        data.es_sistema ? 1 : 0,
        data.activo !== false ? 1 : 0
      ]
    );

    const moduloId = result.insertId;

    console.log(`MODULO-FRONTEND: Creado modulo_id=${moduloId} codigo="${data.codigo}"`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'modulos_frontend',
      registro_id: moduloId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: data,
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return moduloId;
  }

  /**
   * Actualizar módulo
   */
  static async update(
    id: number,
    data: Partial<ModuloFrontendData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Obtener estado anterior
    const moduloAnterior = await this.getById(id);
    if (!moduloAnterior) {
      throw new Error('Módulo no encontrado');
    }

    // Si es módulo del sistema, no permitir cambiar el código
    if (moduloAnterior.es_sistema && data.codigo && data.codigo !== moduloAnterior.codigo) {
      throw new Error('No se puede cambiar el código de un módulo del sistema');
    }

    // Validar código duplicado
    if (data.codigo && data.codigo !== moduloAnterior.codigo) {
      const existente = await this.getByCodigo(data.codigo);
      if (existente) {
        throw new Error('Ya existe un módulo con ese código');
      }
    }

    // Validar que no se establezca como padre de sí mismo
    if (data.padre_id === id) {
      throw new Error('Un módulo no puede ser padre de sí mismo');
    }

    // Validar que el padre existe si se especifica
    if (data.padre_id) {
      const padre = await this.getById(data.padre_id);
      if (!padre) {
        throw new Error('El módulo padre no existe');
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
    if (data.icono !== undefined) {
      updates.push('icono = ?');
      params.push(data.icono);
    }
    if (data.ruta !== undefined) {
      updates.push('ruta = ?');
      params.push(data.ruta);
    }
    if (data.padre_id !== undefined) {
      updates.push('padre_id = ?');
      params.push(data.padre_id);
    }
    if (data.orden !== undefined) {
      updates.push('orden = ?');
      params.push(data.orden);
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
      `UPDATE modulos_frontend SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    console.log(`MODULO-FRONTEND: Actualizado modulo_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'modulos_frontend',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: moduloAnterior,
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

    const moduloAnterior = await this.getById(id);
    if (!moduloAnterior) {
      throw new Error('Módulo no encontrado');
    }

    if (moduloAnterior.activo === activo) {
      throw new Error(`El módulo ya está ${activo ? 'activo' : 'inactivo'}`);
    }

    // Si tiene hijos, no permitir desactivar
    if (!activo && moduloAnterior.total_hijos! > 0) {
      throw new Error(`No se puede desactivar: tiene ${moduloAnterior.total_hijos} submódulo(s)`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE modulos_frontend SET activo = ?, updated_at = NOW() WHERE id = ?',
      [activo ? 1 : 0, id]
    );

    console.log(`MODULO-FRONTEND: Cambio estado modulo_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'modulos_frontend',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: moduloAnterior.activo },
        datos_nuevos: { activo },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente (solo módulos personalizados sin hijos)
   */
  static async delete(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const modulo = await this.getById(id);
    if (!modulo) {
      throw new Error('Módulo no encontrado');
    }

    // No permitir eliminar módulos del sistema
    if (modulo.es_sistema) {
      throw new Error(`No se puede eliminar el módulo "${modulo.nombre}" porque es parte del sistema`);
    }

    // Validar que no tenga submódulos
    if (modulo.total_hijos! > 0) {
      throw new Error(`No se puede eliminar: tiene ${modulo.total_hijos} submódulo(s)`);
    }

    // Verificar que no esté asignado a ningún perfil
    const [asignaciones] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM perfil_modulos WHERE modulo_id = ? AND activo = 1',
      [id]
    );

    if (asignaciones[0].total > 0) {
      throw new Error(`No se puede eliminar: tiene ${asignaciones[0].total} asignación(es) activa(s)`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM modulos_frontend WHERE id = ?',
      [id]
    );

    console.log(`MODULO-FRONTEND: Eliminado modulo_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'modulos_frontend',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: modulo,
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
    return AuditoriaService.getHistorial('modulos_frontend', id);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToModulo(row: any): ModuloFrontendDetallado {
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      icono: row.icono,
      ruta: row.ruta,
      padre_id: row.padre_id,
      orden: row.orden,
      es_sistema: !!row.es_sistema,
      activo: !!row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      padre_nombre: row.padre_nombre,
      total_hijos: row.total_hijos
    };
  }
}