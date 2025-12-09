// src/models/empresa/Ubicacion.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface UbicacionData {
  id?: number;
  empresa_id: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  telefono?: string;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UbicacionConEmpresa extends UbicacionData {
  empresa_nombre?: string;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Ubicacion {
  /**
   * Listar todas las ubicaciones (con filtro opcional por empresa)
   */
  static async getAll(empresaId?: number): Promise<UbicacionConEmpresa[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        u.id,
        u.empresa_id,
        u.nombre,
        u.codigo,
        u.direccion,
        u.telefono,
        u.activo,
        u.created_at,
        u.updated_at,
        e.nombre AS empresa_nombre
      FROM ubicaciones u
      INNER JOIN empresas e ON u.empresa_id = e.id
    `;

    const params: any[] = [];

    if (empresaId) {
      query += ' WHERE u.empresa_id = ?';
      params.push(empresaId);
    }

    query += ' ORDER BY u.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => ({
      id: row.id,
      empresa_id: row.empresa_id,
      nombre: row.nombre,
      codigo: row.codigo,
      direccion: row.direccion,
      telefono: row.telefono,
      activo: !!row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      empresa_nombre: row.empresa_nombre
    }));
  }

  /**
   * Obtener una ubicación por ID
   */
  static async getById(id: number): Promise<UbicacionConEmpresa | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        u.id,
        u.empresa_id,
        u.nombre,
        u.codigo,
        u.direccion,
        u.telefono,
        u.activo,
        u.created_at,
        u.updated_at,
        e.nombre AS empresa_nombre
      FROM ubicaciones u
      INNER JOIN empresas e ON u.empresa_id = e.id
      WHERE u.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      empresa_id: row.empresa_id,
      nombre: row.nombre,
      codigo: row.codigo,
      direccion: row.direccion,
      telefono: row.telefono,
      activo: !!row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      empresa_nombre: row.empresa_nombre
    };
  }

  /**
   * Crear una nueva ubicación
   */
  static async create(data: UbicacionData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // Validar que la empresa existe
    const [empresaRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM empresas WHERE id = ?',
      [data.empresa_id]
    );

    if (empresaRows.length === 0) {
      throw new Error('Empresa no encontrada');
    }

    // Validar que el código no exista
    const [codigoRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM ubicaciones WHERE codigo = ?',
      [data.codigo]
    );

    if (codigoRows.length > 0) {
      throw new Error('El código de ubicación ya existe');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO ubicaciones (
        empresa_id, nombre, codigo, direccion, telefono, activo
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        data.empresa_id,
        data.nombre,
        data.codigo,
        data.direccion || null,
        data.telefono || null,
        data.activo !== undefined ? data.activo : true
      ]
    );

    const ubicacionId = result.insertId;

    console.log(`UBICACION: Creada ubicacion_id=${ubicacionId} codigo=${data.codigo}`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'ubicaciones',
      registro_id: ubicacionId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: {
        empresa_id: data.empresa_id,
        nombre: data.nombre,
        codigo: data.codigo,
        direccion: data.direccion,
        telefono: data.telefono,
        activo: data.activo !== undefined ? data.activo : true
      },
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return ubicacionId;
  }

  /**
   * Actualizar una ubicación existente
   */
  static async update(
    id: number,
    data: Partial<UbicacionData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Guardar estado anterior para auditoría
    const ubicacionAnterior = await this.getById(id);
    if (!ubicacionAnterior) {
      throw new Error('Ubicación no encontrada');
    }

    // Validación de código duplicado
    if (data.codigo && data.codigo !== ubicacionAnterior.codigo) {
      const [codigoRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM ubicaciones WHERE codigo = ? AND id != ?',
        [data.codigo, id]
      );

      if (codigoRows.length > 0) {
        throw new Error('El código de ubicación ya existe');
      }
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(data.nombre);
    }
    if (data.codigo !== undefined) {
      updates.push('codigo = ?');
      params.push(data.codigo);
    }
    if (data.direccion !== undefined) {
      updates.push('direccion = ?');
      params.push(data.direccion);
    }
    if (data.telefono !== undefined) {
      updates.push('telefono = ?');
      params.push(data.telefono);
    }
    if (data.activo !== undefined) {
      updates.push('activo = ?');
      params.push(data.activo);
    }

    if (updates.length === 0) {
      return false;
    }

    params.push(id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE ubicaciones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    console.log(`UBICACION: Actualizada ubicacion_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'ubicaciones',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: {
          nombre: ubicacionAnterior.nombre,
          codigo: ubicacionAnterior.codigo,
          direccion: ubicacionAnterior.direccion,
          telefono: ubicacionAnterior.telefono,
          activo: ubicacionAnterior.activo
        },
        datos_nuevos: data,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Desactivar una ubicación (soft delete)
   */
  static async deactivate(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const ubicacion = await this.getById(id);
    if (!ubicacion) {
      throw new Error('Ubicación no encontrada');
    }

    if (!ubicacion.activo) {
      throw new Error('La ubicación ya está inactiva');
    }

    const [pvRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM puntos_venta WHERE ubicacion_id = ? AND activo = 1',
      [id]
    );

    if (pvRows[0].count > 0) {
      throw new Error(
        `No se puede desactivar: la ubicación tiene ${pvRows[0].count} punto(s) de venta activo(s)`
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE ubicaciones SET activo = 0 WHERE id = ?',
      [id]
    );

    console.log(`UBICACION: Desactivada ubicacion_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'ubicaciones',
        registro_id: id,
        accion: 'DEACTIVATE',
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
   * Reactivar una ubicación
   */
  static async reactivate(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const ubicacion = await this.getById(id);
    if (!ubicacion) {
      throw new Error('Ubicación no encontrada');
    }

    if (ubicacion.activo) {
      throw new Error('La ubicación ya está activa');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE ubicaciones SET activo = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      console.log(`UBICACION: Reactivada ubicacion_id=${id}`);

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'ubicaciones',
        registro_id: id,
        accion: 'REACTIVATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: false },
        datos_nuevos: { activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });

      return true;
    }

    return false;
  }

  /**
   * Eliminar FÍSICAMENTE (hard delete)
   */
  static async deletePermanently(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const ubicacion = await this.getById(id);
    if (!ubicacion) {
      throw new Error('Ubicación no encontrada');
    }

    // Verificar puntos de venta
    const [pvRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM puntos_venta WHERE ubicacion_id = ?',
      [id]
    );

    if (pvRows[0].count > 0) {
      throw new Error(
        `No se puede eliminar: tiene ${pvRows[0].count} punto(s) de venta asociado(s). ` +
        `Elimina primero los puntos de venta.`
      );
    }

    // Verificar usuarios asignados
    const [usuRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM usuario_ubicaciones WHERE ubicacion_id = ?',
      [id]
    );

    if (usuRows[0].count > 0) {
      throw new Error(
        `No se puede eliminar: tiene ${usuRows[0].count} usuario(s) asignado(s). ` +
        `Revoca los accesos primero.`
      );
    }

    // Eliminación física
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM ubicaciones WHERE id = ?',
      [id]
    );

    console.log(`UBICACION: Eliminada PERMANENTEMENTE ubicacion_id=${id} codigo=${ubicacion.codigo}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'ubicaciones',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: ubicacion,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Obtener estadísticas de una ubicación
   */
  static async getStats(id: number) {
    const pool = getPool('local');

    const [stats] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM puntos_venta WHERE ubicacion_id = ? AND activo = 1) as puntos_venta_activos,
        (SELECT COUNT(*) FROM puntos_venta WHERE ubicacion_id = ?) as puntos_venta_total,
        (SELECT COUNT(DISTINCT uu.usuario_id) 
         FROM usuario_ubicaciones uu 
         WHERE uu.ubicacion_id = ? AND uu.activo = 1) as usuarios_asignados
      `,
      [id, id, id]
    );

    return stats[0];
  }

  /**
   * Obtener historial de auditoría de una ubicación
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('ubicaciones', id);
  }
}