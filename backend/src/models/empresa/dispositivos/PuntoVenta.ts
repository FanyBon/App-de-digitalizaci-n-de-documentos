import { getPool } from '../../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../../services/auditoriaService';

export interface PuntoVentaData {
  id?: number;
  codigo: string;
  nombre: string;
  ubicacion_id: number;
  empresa_id: number;
  tipo_id: number;  // ⭐ CAMBIADO: de 'tipo' a 'tipo_id'
  activo?: boolean;
  creado_por?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface PuntoVentaDetallado extends PuntoVentaData {
  ubicacion_nombre?: string;
  ubicacion_codigo?: string;
  empresa_nombre?: string;
  creado_por_nombre?: string;
  // ⭐ NUEVO: Info del tipo
  tipo_codigo?: string;
  tipo_nombre?: string;
  tipo_icono?: string;
  tipo_color?: string;
  tipo_categoria?: string;
  tipo_requiere_caja?: boolean;
  tipo_permite_ventas?: boolean;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class PuntoVenta {
  /**
   * Listar todos los puntos de venta con filtros
   */
  static async getAll(filters?: {
    empresa_id?: number;
    ubicacion_id?: number;
    tipo_id?: number;
    activo?: boolean;
  }): Promise<PuntoVentaDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        pv.id,
        pv.codigo,
        pv.nombre,
        pv.ubicacion_id,
        pv.empresa_id,
        pv.tipo_id,
        pv.activo,
        pv.creado_por,
        pv.created_at,
        pv.updated_at,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        e.nombre AS empresa_nombre,
        u.nombre_usuario AS creado_por_nombre,
        tpv.codigo AS tipo_codigo,
        tpv.nombre AS tipo_nombre,
        tpv.icono AS tipo_icono,
        tpv.color AS tipo_color,
        tpv.categoria AS tipo_categoria,
        tpv.requiere_caja AS tipo_requiere_caja,
        tpv.permite_ventas AS tipo_permite_ventas
      FROM puntos_venta pv
      INNER JOIN ubicaciones ub ON pv.ubicacion_id = ub.id
      INNER JOIN empresas e ON pv.empresa_id = e.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      LEFT JOIN usuarios u ON pv.creado_por = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.empresa_id) {
      query += ' AND pv.empresa_id = ?';
      params.push(filters.empresa_id);
    }

    if (filters?.ubicacion_id) {
      query += ' AND pv.ubicacion_id = ?';
      params.push(filters.ubicacion_id);
    }

    if (filters?.tipo_id) {
      query += ' AND pv.tipo_id = ?';
      params.push(filters.tipo_id);
    }

    if (filters?.activo !== undefined) {
      query += ' AND pv.activo = ?';
      params.push(filters.activo);
    }

    query += ' ORDER BY pv.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToPuntoVenta(row));
  }

  /**
   * Listar puntos de venta por ubicación
   */
  static async getByUbicacion(ubicacionId: number): Promise<PuntoVentaDetallado[]> {
    return this.getAll({ ubicacion_id: ubicacionId, activo: true });
  }

  /**
   * Listar puntos de venta por empresa
   */
  static async getByEmpresa(empresaId: number): Promise<PuntoVentaDetallado[]> {
    return this.getAll({ empresa_id: empresaId });
  }

  /**
   * Obtener un punto de venta por ID
   */
  static async getById(id: number): Promise<PuntoVentaDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        pv.id,
        pv.codigo,
        pv.nombre,
        pv.ubicacion_id,
        pv.empresa_id,
        pv.tipo_id,
        pv.activo,
        pv.creado_por,
        pv.created_at,
        pv.updated_at,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        e.nombre AS empresa_nombre,
        u.nombre_usuario AS creado_por_nombre,
        tpv.codigo AS tipo_codigo,
        tpv.nombre AS tipo_nombre,
        tpv.icono AS tipo_icono,
        tpv.color AS tipo_color,
        tpv.categoria AS tipo_categoria,
        tpv.requiere_caja AS tipo_requiere_caja,
        tpv.permite_ventas AS tipo_permite_ventas
      FROM puntos_venta pv
      INNER JOIN ubicaciones ub ON pv.ubicacion_id = ub.id
      INNER JOIN empresas e ON pv.empresa_id = e.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      LEFT JOIN usuarios u ON pv.creado_por = u.id
      WHERE pv.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToPuntoVenta(rows[0]);
  }

  /**
   * Obtener un punto de venta por código
   */
  static async getByCodigo(codigo: string): Promise<PuntoVentaDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        pv.id,
        pv.codigo,
        pv.nombre,
        pv.ubicacion_id,
        pv.empresa_id,
        pv.tipo_id,
        pv.activo,
        pv.creado_por,
        pv.created_at,
        pv.updated_at,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        e.nombre AS empresa_nombre,
        u.nombre_usuario AS creado_por_nombre,
        tpv.codigo AS tipo_codigo,
        tpv.nombre AS tipo_nombre,
        tpv.icono AS tipo_icono,
        tpv.color AS tipo_color,
        tpv.categoria AS tipo_categoria,
        tpv.requiere_caja AS tipo_requiere_caja,
        tpv.permite_ventas AS tipo_permite_ventas
      FROM puntos_venta pv
      INNER JOIN ubicaciones ub ON pv.ubicacion_id = ub.id
      INNER JOIN empresas e ON pv.empresa_id = e.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      LEFT JOIN usuarios u ON pv.creado_por = u.id
      WHERE pv.codigo = ?
      `,
      [codigo]
    );

    if (rows.length === 0) return null;

    return this.mapRowToPuntoVenta(rows[0]);
  }

  /**
   * Crear un nuevo punto de venta
   */
  static async create(data: PuntoVentaData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // 1. Validar que la empresa existe
    const [empresaRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM empresas WHERE id = ?',
      [data.empresa_id]
    );

    if (empresaRows.length === 0) {
      throw new Error('Empresa no encontrada');
    }

    // 2. Validar que la ubicación existe y está activa
    const [ubicacionRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM ubicaciones WHERE id = ? AND activo = 1',
      [data.ubicacion_id]
    );

    if (ubicacionRows.length === 0) {
      throw new Error('Ubicación no encontrada o inactiva');
    }

    // 3. Validar que el código no exista
    const [codigoRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM puntos_venta WHERE codigo = ?',
      [data.codigo]
    );

    if (codigoRows.length > 0) {
      throw new Error('El código de punto de venta ya existe');
    }

    // 4. ⭐ NUEVO: Validar que el tipo existe y está activo
    const [tipoRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tipos_punto_venta WHERE id = ? AND activo = 1',
      [data.tipo_id]
    );

    if (tipoRows.length === 0) {
      throw new Error('Tipo de punto de venta no encontrado o inactivo');
    }

    // 5. Crear punto de venta
    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO puntos_venta (
        codigo, nombre, ubicacion_id, empresa_id, tipo_id, activo, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.codigo,
        data.nombre,
        data.ubicacion_id,
        data.empresa_id,
        data.tipo_id,  // ⭐ CAMBIADO
        data.activo !== undefined ? data.activo : true,
        data.creado_por || null
      ]
    );

    const puntoVentaId = result.insertId;

    console.log(
      `PUNTO_VENTA: Creado punto_venta_id=${puntoVentaId} ` +
      `codigo=${data.codigo} tipo_id=${data.tipo_id}`
    );

    // 6. Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'puntos_venta',
      registro_id: puntoVentaId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: {
        codigo: data.codigo,
        nombre: data.nombre,
        ubicacion_id: data.ubicacion_id,
        empresa_id: data.empresa_id,
        tipo_id: data.tipo_id,  // ⭐ CAMBIADO
        activo: data.activo !== undefined ? data.activo : true,
        creado_por: data.creado_por
      },
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return puntoVentaId;
  }

  /**
 * Actualizar un punto de venta
 */
static async update(
    id: number,
    data: Partial<PuntoVentaData>,
    auditoria: AuditoriaContext
): Promise<boolean> {
    const pool = getPool('local');

    // 1. Obtener estado anterior
    const puntoVentaAnterior = await this.getById(id);
    if (!puntoVentaAnterior) {
        throw new Error('Punto de venta no encontrado');
    }

    // 2. Validar código duplicado
    if (data.codigo && data.codigo !== puntoVentaAnterior.codigo) {
        const [codigoRows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM puntos_venta WHERE codigo = ? AND id != ?',
            [data.codigo, id]
        );

        if (codigoRows.length > 0) {
            throw new Error('El código de punto de venta ya existe');
        }
    }

    // 3. ✅ NUEVO: Validar tipo si se proporciona
    if (data.tipo_id !== undefined) {
        const [tipoRows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM tipos_punto_venta WHERE id = ? AND activo = 1',
            [data.tipo_id]
        );

        if (tipoRows.length === 0) {
            throw new Error('Tipo de punto de venta no encontrado o inactivo');
        }
    }

    // 4. ✅ NUEVO: Validar empresa si se proporciona
    if (data.empresa_id !== undefined) {
        const [empresaRows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM empresas WHERE id = ?',
            [data.empresa_id]
        );

        if (empresaRows.length === 0) {
            throw new Error('Empresa no encontrada');
        }
    }

    // 5. ✅ NUEVO: Validar ubicación si se proporciona
    if (data.ubicacion_id !== undefined) {
        const [ubicacionRows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM ubicaciones WHERE id = ? AND activo = 1',
            [data.ubicacion_id]
        );

        if (ubicacionRows.length === 0) {
            throw new Error('Ubicación no encontrada o inactiva');
        }
    }

    // 6. Construir query dinámicamente
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
    if (data.tipo_id !== undefined) {
        updates.push('tipo_id = ?');
        params.push(data.tipo_id);
    }
    // ✅ NUEVOS: Permitir actualizar empresa y ubicación
    if (data.empresa_id !== undefined) {
        updates.push('empresa_id = ?');
        params.push(data.empresa_id);
    }
    if (data.ubicacion_id !== undefined) {
        updates.push('ubicacion_id = ?');
        params.push(data.ubicacion_id);
    }
    if (data.activo !== undefined) {
        updates.push('activo = ?');
        params.push(data.activo);
    }

    if (updates.length === 0) {
        return false;
    }

    params.push(id);

    // 7. Ejecutar UPDATE
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE puntos_venta SET ${updates.join(', ')} WHERE id = ?`,
        params
    );

    console.log(`PUNTO_VENTA: Actualizado punto_venta_id=${id}`);

    // 8. ✅ Registrar en auditoría (incluyendo empresa y ubicación)
    if (result.affectedRows > 0) {
        await AuditoriaService.registrar({
            tabla: 'puntos_venta',
            registro_id: id,
            accion: 'UPDATE',
            usuario_id: auditoria.usuario_id,
            usuario_nombre: auditoria.usuario_nombre,
            datos_anteriores: {
                codigo: puntoVentaAnterior.codigo,
                nombre: puntoVentaAnterior.nombre,
                tipo_id: puntoVentaAnterior.tipo_id,
                empresa_id: puntoVentaAnterior.empresa_id,      // ✅ AGREGAR
                ubicacion_id: puntoVentaAnterior.ubicacion_id,  // ✅ AGREGAR
                activo: puntoVentaAnterior.activo
            },
            datos_nuevos: data,
            ip_address: auditoria.ip,
            user_agent: auditoria.user_agent
        });
    }
    return result.affectedRows > 0;
  }

  /**
   * Desactivar un punto de venta (soft delete)
   */
  static async deactivate(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const puntoVenta = await this.getById(id);
    if (!puntoVenta) {
      throw new Error('Punto de venta no encontrado');
    }

    if (!puntoVenta.activo) {
      throw new Error('El punto de venta ya está inactivo');
    }

    // Verificar sesiones activas
    const [sesionesRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM sesiones WHERE punto_venta_id = ? AND activa = 1',
      [id]
    );

    if (sesionesRows[0].count > 0) {
      throw new Error(
        `No se puede desactivar: el punto de venta tiene ${sesionesRows[0].count} sesión(es) activa(s)`
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE puntos_venta SET activo = 0 WHERE id = ?',
      [id]
    );

    console.log(`PUNTO_VENTA: Desactivado punto_venta_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'puntos_venta',
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
   * Reactivar un punto de venta
   */
  static async reactivate(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const puntoVenta = await this.getById(id);
    if (!puntoVenta) {
      throw new Error('Punto de venta no encontrado');
    }

    if (puntoVenta.activo) {
      throw new Error('El punto de venta ya está activo');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE puntos_venta SET activo = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows > 0) {
      console.log(`PUNTO_VENTA: Reactivado punto_venta_id=${id}`);

      await AuditoriaService.registrar({
        tabla: 'puntos_venta',
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
   * Eliminar permanentemente un punto de venta
   */
  static async deletePermanently(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const puntoVenta = await this.getById(id);
    if (!puntoVenta) {
      throw new Error('Punto de venta no encontrado');
    }

    // Verificar sesiones
    const [sesionesRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM sesiones WHERE punto_venta_id = ?',
      [id]
    );

    if (sesionesRows[0].count > 0) {
      throw new Error(
        `No se puede eliminar: tiene ${sesionesRows[0].count} sesión(es) registrada(s). ` +
        `Elimina primero las sesiones.`
      );
    }

    // Eliminación física
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM puntos_venta WHERE id = ?',
      [id]
    );

    console.log(
      `PUNTO_VENTA: Eliminado PERMANENTEMENTE punto_venta_id=${id} ` +
      `codigo=${puntoVenta.codigo}`
    );

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'puntos_venta',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: puntoVenta,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Obtener estadísticas de un punto de venta
   */
  static async getStats(id: number) {
    const pool = getPool('local');

    const [stats] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM sesiones WHERE punto_venta_id = ? AND activa = 1) as sesiones_activas,
        (SELECT COUNT(*) FROM sesiones WHERE punto_venta_id = ?) as sesiones_total,
        (SELECT MAX(fecha_inicio) FROM sesiones WHERE punto_venta_id = ?) as ultima_sesion
      `,
      [id, id, id]
    );

    return stats[0];
  }

  /**
   * Helper: Mapear fila a objeto PuntoVentaDetallado
   */
  private static mapRowToPuntoVenta(row: any): PuntoVentaDetallado {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    ubicacion_id: row.ubicacion_id,
    empresa_id: row.empresa_id,
    tipo_id: row.tipo_id,  // ⭐ ASEGÚRATE QUE ESTA LÍNEA EXISTA
    activo: !!row.activo,
    creado_por: row.creado_por,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ubicacion_nombre: row.ubicacion_nombre,
    ubicacion_codigo: row.ubicacion_codigo,
    empresa_nombre: row.empresa_nombre,
    creado_por_nombre: row.creado_por_nombre,
    tipo_codigo: row.tipo_codigo,
    tipo_nombre: row.tipo_nombre,
    tipo_icono: row.tipo_icono,
    tipo_color: row.tipo_color,
    tipo_categoria: row.tipo_categoria,
    tipo_requiere_caja: !!row.tipo_requiere_caja,
    tipo_permite_ventas: !!row.tipo_permite_ventas
  };
}

  /**
   * Obtener historial de auditoría
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('puntos_venta', id);
  }
}