// src/models/empresa/TipoPuntoVenta.ts
import { getPool } from '../../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../../services/auditoriaService';

export interface TipoPuntoVentaData {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden?: number;
  categoria?: 'venta' | 'operacion' | 'servicio' | 'staff';
  requiere_caja?: boolean;
  permite_ventas?: boolean;
  activo?: boolean;
  creado_por?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class TipoPuntoVenta {
  /**
   * Listar todos los tipos (con filtro de activos opcional)
   */
  static async getAll(soloActivos: boolean = true): Promise<TipoPuntoVentaData[]> {
    const pool = getPool('local');

    let query = 'SELECT * FROM tipos_punto_venta';
    
    if (soloActivos) {
      query += ' WHERE activo = 1';
    }

    query += ' ORDER BY orden ASC, nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query);

    return rows.map(row => this.mapRowToTipo(row));
  }

  /**
   * Obtener tipo por ID
   */
  static async getById(id: number): Promise<TipoPuntoVentaData | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tipos_punto_venta WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToTipo(rows[0]);
  }

  /**
   * Obtener tipo por código
   */
  static async getByCodigo(codigo: string): Promise<TipoPuntoVentaData | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tipos_punto_venta WHERE codigo = ?',
      [codigo]
    );

    if (rows.length === 0) return null;

    return this.mapRowToTipo(rows[0]);
  }

  /**
   * Crear nuevo tipo
   */
  static async create(
    data: TipoPuntoVentaData,
    auditoria: AuditoriaContext
  ): Promise<number> {
    const pool = getPool('local');

    // Validar código único
    const existe = await this.getByCodigo(data.codigo);
    if (existe) {
      throw new Error('El código de tipo ya existe');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO tipos_punto_venta (
        codigo, nombre, descripcion, icono, color, orden,
        categoria, requiere_caja, permite_ventas, activo, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.codigo,
        data.nombre,
        data.descripcion || null,
        data.icono || null,
        data.color || null,
        data.orden || 0,
        data.categoria || 'operacion',
        data.requiere_caja !== undefined ? data.requiere_caja : false,
        data.permite_ventas !== undefined ? data.permite_ventas : true,
        data.activo !== undefined ? data.activo : true,
        data.creado_por || null
      ]
    );

    const tipoId = result.insertId;

    console.log(`TIPO_PDV: Creado tipo_id=${tipoId} codigo=${data.codigo}`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'tipos_punto_venta',
      registro_id: tipoId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: data,
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return tipoId;
  }

  /**
   * Actualizar tipo
   */
  static async update(
    id: number,
    data: Partial<TipoPuntoVentaData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    const tipoAnterior = await this.getById(id);
    if (!tipoAnterior) {
      throw new Error('Tipo de punto de venta no encontrado');
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
    if (data.icono !== undefined) {
      updates.push('icono = ?');
      params.push(data.icono);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
    if (data.orden !== undefined) {
      updates.push('orden = ?');
      params.push(data.orden);
    }
    if (data.categoria !== undefined) {
      updates.push('categoria = ?');
      params.push(data.categoria);
    }
    if (data.requiere_caja !== undefined) {
      updates.push('requiere_caja = ?');
      params.push(data.requiere_caja);
    }
    if (data.permite_ventas !== undefined) {
      updates.push('permite_ventas = ?');
      params.push(data.permite_ventas);
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
      `UPDATE tipos_punto_venta SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    console.log(`TIPO_PDV: Actualizado tipo_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'tipos_punto_venta',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: tipoAnterior,
        datos_nuevos: data,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Desactivar tipo
   */
  static async deactivate(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const tipo = await this.getById(id);
    if (!tipo) {
      throw new Error('Tipo de punto de venta no encontrado');
    }

    if (!tipo.activo) {
      throw new Error('El tipo ya está inactivo');
    }

    // Verificar si hay PDVs activos usando este tipo
    const [pdvsRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM puntos_venta WHERE tipo_id = ? AND activo = 1',
      [id]
    );

    if (pdvsRows[0].count > 0) {
      throw new Error(
        `No se puede desactivar: hay ${pdvsRows[0].count} punto(s) de venta activo(s) usando este tipo`
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE tipos_punto_venta SET activo = 0 WHERE id = ?',
      [id]
    );

    console.log(`TIPO_PDV: Desactivado tipo_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'tipos_punto_venta',
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
   * Reactivar tipo
   */
  static async reactivate(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const tipo = await this.getById(id);
    if (!tipo) {
      throw new Error('Tipo de punto de venta no encontrado');
    }

    if (tipo.activo) {
      throw new Error('El tipo ya está activo');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE tipos_punto_venta SET activo = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      console.log(`TIPO_PDV: Reactivado tipo_id=${id}`);

      await AuditoriaService.registrar({
        tabla: 'tipos_punto_venta',
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
   * Obtener estadísticas de uso
   */
  static async getStats(id: number) {
    const pool = getPool('local');

    const [stats] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM puntos_venta WHERE tipo_id = ? AND activo = 1) as pdvs_activos,
        (SELECT COUNT(*) FROM puntos_venta WHERE tipo_id = ?) as pdvs_total,
        (SELECT COUNT(*) FROM sesiones s 
         INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id 
         WHERE pv.tipo_id = ? AND s.activa = 1) as sesiones_activas
      `,
      [id, id, id]
    );

    return stats[0];
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToTipo(row: any): TipoPuntoVentaData {
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      icono: row.icono,
      color: row.color,
      orden: row.orden,
      categoria: row.categoria,
      requiere_caja: !!row.requiere_caja,
      permite_ventas: !!row.permite_ventas,
      activo: !!row.activo,
      creado_por: row.creado_por,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Obtener historial de auditoría
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('tipos_punto_venta', id);
  }
}