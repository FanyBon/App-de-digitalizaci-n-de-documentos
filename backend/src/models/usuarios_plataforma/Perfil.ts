// src/models/usuarios_plataforma/Perfil.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface PerfilData {
  id?: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  es_sistema?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface PerfilDetallado extends PerfilData {
  total_usuarios?: number;
  usuarios_activos?: number;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Perfil {
  /**
   * Listar todos los perfiles con filtros
   */
  static async getAll(filters?: {
    activo?: boolean;
    es_sistema?: boolean;
  }): Promise<PerfilDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.activo,
        p.es_sistema,
        p.created_at,
        p.updated_at,
        (SELECT COUNT(*) FROM usuario_perfiles up WHERE up.perfil_id = p.id) AS total_usuarios,
        (SELECT COUNT(*) FROM usuario_perfiles up 
         INNER JOIN usuarios u ON up.usuario_id = u.id 
         WHERE up.perfil_id = p.id AND u.activo = 1) AS usuarios_activos
      FROM perfiles p
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.activo !== undefined) {
      query += ' AND p.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    if (filters?.es_sistema !== undefined) {
      query += ' AND p.es_sistema = ?';
      params.push(filters.es_sistema ? 1 : 0);
    }

    query += ' ORDER BY p.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToPerfil(row));
  }

  /**
   * Obtener perfil por ID
   */
  static async getById(id: number): Promise<PerfilDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.activo,
        p.es_sistema,
        p.created_at,
        p.updated_at,
        (SELECT COUNT(*) FROM usuario_perfiles up WHERE up.perfil_id = p.id) AS total_usuarios,
        (SELECT COUNT(*) FROM usuario_perfiles up 
         INNER JOIN usuarios u ON up.usuario_id = u.id 
         WHERE up.perfil_id = p.id AND u.activo = 1) AS usuarios_activos
      FROM perfiles p
      WHERE p.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToPerfil(rows[0]);
  }

  /**
   * Obtener perfil por nombre
   */
  static async getByNombre(nombre: string): Promise<PerfilDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.activo,
        p.es_sistema,
        p.created_at,
        p.updated_at,
        (SELECT COUNT(*) FROM usuario_perfiles up WHERE up.perfil_id = p.id) AS total_usuarios,
        (SELECT COUNT(*) FROM usuario_perfiles up 
         INNER JOIN usuarios u ON up.usuario_id = u.id 
         WHERE up.perfil_id = p.id AND u.activo = 1) AS usuarios_activos
      FROM perfiles p
      WHERE p.nombre = ?
      `,
      [nombre]
    );

    if (rows.length === 0) return null;

    return this.mapRowToPerfil(rows[0]);
  }

  /**
   * Crear nuevo perfil
   */
  static async create(data: PerfilData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // Validar que el nombre no esté duplicado
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM perfiles WHERE nombre = ?',
      [data.nombre]
    );

    if (existente.length > 0) {
      throw new Error('Ya existe un perfil con ese nombre');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO perfiles (
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

    const perfilId = result.insertId;

    console.log(`PERFIL: Creado perfil_id=${perfilId} nombre="${data.nombre}"`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'perfiles',
      registro_id: perfilId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: data,
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return perfilId;
  }

  /**
   * Actualizar perfil
   */
  static async update(
    id: number,
    data: Partial<PerfilData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Obtener estado anterior
    const perfilAnterior = await this.getById(id);
    if (!perfilAnterior) {
      throw new Error('Perfil no encontrado');
    }

    // Si es perfil del sistema, no permitir cambiar el nombre
    if (perfilAnterior.es_sistema && data.nombre && data.nombre !== perfilAnterior.nombre) {
      throw new Error('No se puede cambiar el nombre de un perfil del sistema');
    }

    // Validar nombre duplicado
    if (data.nombre && data.nombre !== perfilAnterior.nombre) {
      const [existente] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM perfiles WHERE nombre = ? AND id != ?',
        [data.nombre, id]
      );

      if (existente.length > 0) {
        throw new Error('Ya existe un perfil con ese nombre');
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
      `UPDATE perfiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    console.log(`PERFIL: Actualizado perfil_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'perfiles',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: {
          nombre: perfilAnterior.nombre,
          descripcion: perfilAnterior.descripcion,
          activo: perfilAnterior.activo
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

    const perfilAnterior = await this.getById(id);
    if (!perfilAnterior) {
      throw new Error('Perfil no encontrado');
    }

    if (perfilAnterior.activo === activo) {
      throw new Error(`El perfil ya está ${activo ? 'activo' : 'inactivo'}`);
    }

    // No permitir inactivar perfiles del sistema que están en uso
    if (!activo && perfilAnterior.es_sistema && perfilAnterior.usuarios_activos! > 0) {
      throw new Error(
        `No se puede inactivar el perfil "${perfilAnterior.nombre}" del sistema: tiene ${perfilAnterior.usuarios_activos} usuario(s) activo(s)`
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE perfiles SET activo = ?, updated_at = NOW() WHERE id = ?',
      [activo ? 1 : 0, id]
    );

    console.log(`PERFIL: Cambio estado perfil_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'perfiles',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: perfilAnterior.activo },
        datos_nuevos: { activo },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente (solo perfiles personalizados sin usuarios)
   */
  static async delete(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const perfil = await this.getById(id);
    if (!perfil) {
      throw new Error('Perfil no encontrado');
    }

    // No permitir eliminar perfiles del sistema
    if (perfil.es_sistema) {
      throw new Error(`No se puede eliminar el perfil "${perfil.nombre}" porque es parte del sistema`);
    }

    // Validar que no tenga usuarios asignados
    if (perfil.total_usuarios! > 0) {
      throw new Error(`No se puede eliminar: tiene ${perfil.total_usuarios} usuario(s) asignado(s)`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM perfiles WHERE id = ?',
      [id]
    );

    console.log(`PERFIL: Eliminado perfil_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'perfiles',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: perfil,
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
    return AuditoriaService.getHistorial('perfiles', id);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToPerfil(row: any): PerfilDetallado {
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
  static async listar(): Promise<PerfilData[]> {
    return this.getAll();
  }

  /**
   * @deprecated Use getById() instead
   */
  static async obtenerPorId(id: number): Promise<PerfilData | null> {
    return this.getById(id);
  }

  /**
   * @deprecated Use create() instead
   */
  static async crear(nombre: string, descripcion: string): Promise<PerfilData> {
    const perfilId = await this.create(
      { nombre, descripcion },
      { usuario_id: 1, usuario_nombre: 'system' }
    );
    const perfil = await this.getById(perfilId);
    return perfil as PerfilData;
  }

  /**
   * @deprecated Use update() instead
   */
  static async editar(id: number, nombre: string, descripcion: string): Promise<boolean> {
    return this.update(
      id,
      { nombre, descripcion },
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