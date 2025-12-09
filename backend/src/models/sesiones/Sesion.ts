// src/models/sesiones/Sesion.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface SesionData {
  id?: number;
  usuario_id: number;
  empresa_id: number;
  ubicacion_id: number;
  punto_venta_id: number;
  fecha_inicio?: Date;
  fecha_fin?: Date | null;
  activa?: boolean;
  ip_address?: string;
  user_agent?: string;
}

export interface SesionDetallada extends SesionData {
  usuario_nombre?: string;
  usuario_email?: string;
  empresa_nombre?: string;
  ubicacion_nombre?: string;
  ubicacion_codigo?: string;
  punto_venta_nombre?: string;
  punto_venta_codigo?: string;
  // ⭐ CAMBIADO: Ahora traemos info del tipo
  punto_venta_tipo_id?: number;
  punto_venta_tipo_codigo?: string;
  punto_venta_tipo_nombre?: string;
  punto_venta_tipo_icono?: string;
  punto_venta_tipo_color?: string;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Sesion {
  /**
   * Obtener sesión activa de un usuario
   */
  static async getSesionActiva(usuarioId: number): Promise<SesionDetallada | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        s.id,
        s.usuario_id,
        s.empresa_id,
        s.ubicacion_id,
        s.punto_venta_id,
        s.fecha_inicio,
        s.fecha_fin,
        s.activa,
        s.ip_address,
        s.user_agent,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        e.nombre AS empresa_nombre,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        pv.nombre AS punto_venta_nombre,
        pv.codigo AS punto_venta_codigo,
        pv.tipo_id AS punto_venta_tipo_id,
        tpv.codigo AS punto_venta_tipo_codigo,
        tpv.nombre AS punto_venta_tipo_nombre,
        tpv.icono AS punto_venta_tipo_icono,
        tpv.color AS punto_venta_tipo_color
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN empresas e ON s.empresa_id = e.id
      INNER JOIN ubicaciones ub ON s.ubicacion_id = ub.id
      INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      WHERE s.usuario_id = ? AND s.activa = 1
      ORDER BY s.fecha_inicio DESC
      LIMIT 1
      `,
      [usuarioId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return this.mapRowToSesion(row);
  }

  /**
   * Obtener sesión por ID
   */
  static async getById(id: number): Promise<SesionDetallada | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        s.id,
        s.usuario_id,
        s.empresa_id,
        s.ubicacion_id,
        s.punto_venta_id,
        s.fecha_inicio,
        s.fecha_fin,
        s.activa,
        s.ip_address,
        s.user_agent,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        e.nombre AS empresa_nombre,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        pv.nombre AS punto_venta_nombre,
        pv.codigo AS punto_venta_codigo,
        pv.tipo_id AS punto_venta_tipo_id,
        tpv.codigo AS punto_venta_tipo_codigo,
        tpv.nombre AS punto_venta_tipo_nombre,
        tpv.icono AS punto_venta_tipo_icono,
        tpv.color AS punto_venta_tipo_color
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN empresas e ON s.empresa_id = e.id
      INNER JOIN ubicaciones ub ON s.ubicacion_id = ub.id
      INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      WHERE s.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToSesion(rows[0]);
  }

  /**
   * Listar todas las sesiones con filtros
   */
  static async getAll(filters?: {
    usuario_id?: number;
    ubicacion_id?: number;
    punto_venta_id?: number;
    empresa_id?: number;
    activa?: boolean;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<SesionDetallada[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        s.id,
        s.usuario_id,
        s.empresa_id,
        s.ubicacion_id,
        s.punto_venta_id,
        s.fecha_inicio,
        s.fecha_fin,
        s.activa,
        s.ip_address,
        s.user_agent,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        e.nombre AS empresa_nombre,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        pv.nombre AS punto_venta_nombre,
        pv.codigo AS punto_venta_codigo,
        pv.tipo_id AS punto_venta_tipo_id,
        tpv.codigo AS punto_venta_tipo_codigo,
        tpv.nombre AS punto_venta_tipo_nombre,
        tpv.icono AS punto_venta_tipo_icono,
        tpv.color AS punto_venta_tipo_color
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN empresas e ON s.empresa_id = e.id
      INNER JOIN ubicaciones ub ON s.ubicacion_id = ub.id
      INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.usuario_id) {
      query += ' AND s.usuario_id = ?';
      params.push(filters.usuario_id);
    }

    if (filters?.ubicacion_id) {
      query += ' AND s.ubicacion_id = ?';
      params.push(filters.ubicacion_id);
    }

    if (filters?.punto_venta_id) {
      query += ' AND s.punto_venta_id = ?';
      params.push(filters.punto_venta_id);
    }

    if (filters?.empresa_id) {
      query += ' AND s.empresa_id = ?';
      params.push(filters.empresa_id);
    }

    if (filters?.activa !== undefined) {
      query += ' AND s.activa = ?';
      params.push(filters.activa);
    }

    if (filters?.fecha_desde) {
      query += ' AND s.fecha_inicio >= ?';
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      query += ' AND s.fecha_inicio <= ?';
      params.push(filters.fecha_hasta);
    }

    query += ' ORDER BY s.fecha_inicio DESC LIMIT 100';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToSesion(row));
  }

  /**
   * Iniciar sesión operativa
   */
  static async iniciar(
    data: {
      usuario_id: number;
      ubicacion_id: number;
      punto_venta_id: number;
    },
    auditoria: AuditoriaContext
  ): Promise<number> {
    const pool = getPool('local');

    // 1. Validar que el usuario no tenga ya una sesión activa
    const sesionActiva = await this.getSesionActiva(data.usuario_id);
    if (sesionActiva) {
      throw new Error(
        `Ya tienes una sesión activa en ${sesionActiva.ubicacion_nombre} - ${sesionActiva.punto_venta_nombre}. ` +
        `Cierra esa sesión primero.`
      );
    }

    // 2. Validar que el punto de venta exista y esté activo
    const [pvRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT pv.id, pv.empresa_id, pv.ubicacion_id, pv.activo,
             ub.activo AS ubicacion_activa
      FROM puntos_venta pv
      INNER JOIN ubicaciones ub ON pv.ubicacion_id = ub.id
      WHERE pv.id = ?
      `,
      [data.punto_venta_id]
    );

    if (pvRows.length === 0) {
      throw new Error('Punto de venta no encontrado');
    }

    const puntoVenta = pvRows[0];

    if (!puntoVenta.activo) {
      throw new Error('El punto de venta está inactivo');
    }

    if (!puntoVenta.ubicacion_activa) {
      throw new Error('La ubicación del punto de venta está inactiva');
    }

    // 3. Validar que el PDV pertenezca a la ubicación indicada
    if (puntoVenta.ubicacion_id !== data.ubicacion_id) {
      throw new Error('El punto de venta no pertenece a la ubicación seleccionada');
    }

    // 4. Validar que el usuario tenga acceso a esa ubicación
    const [accesoRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id FROM usuario_ubicaciones 
      WHERE usuario_id = ? AND ubicacion_id = ? AND activo = 1
      `,
      [data.usuario_id, data.ubicacion_id]
    );

    if (accesoRows.length === 0) {
      throw new Error('No tienes acceso a esta ubicación');
    }

    // 5. Validar que no haya otra sesión activa en ese PDV
    const [otraSesionRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT s.id, u.nombre_usuario 
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.punto_venta_id = ? AND s.activa = 1
      `,
      [data.punto_venta_id]
    );

    if (otraSesionRows.length > 0) {
      throw new Error(
        `Este punto de venta está siendo usado por ${otraSesionRows[0].nombre_usuario}`
      );
    }

    // 6. Crear la sesión
    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO sesiones (
        usuario_id, empresa_id, ubicacion_id, punto_venta_id,
        ip_address, user_agent, activa
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
      [
        data.usuario_id,
        puntoVenta.empresa_id,
        data.ubicacion_id,
        data.punto_venta_id,
        auditoria.ip || null,
        auditoria.user_agent || null
      ]
    );

    const sesionId = result.insertId;

    console.log(
      `SESION: Iniciada sesion_id=${sesionId} ` +
      `usuario_id=${data.usuario_id} punto_venta_id=${data.punto_venta_id}`
    );

    // 7. Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'sesiones',
      registro_id: sesionId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: {
        usuario_id: data.usuario_id,
        empresa_id: puntoVenta.empresa_id,
        ubicacion_id: data.ubicacion_id,
        punto_venta_id: data.punto_venta_id,
        activa: true
      },
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return sesionId;
  }

  /**
   * Cerrar sesión operativa
   */
  static async cerrar(usuarioId: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    // 1. Obtener sesión activa
    const sesionActiva = await this.getSesionActiva(usuarioId);
    if (!sesionActiva) {
      throw new Error('No tienes ninguna sesión activa');
    }

    // 2. Cerrar la sesión
    const [result] = await pool.query<ResultSetHeader>(
      `
      UPDATE sesiones 
      SET activa = 0, fecha_fin = NOW() 
      WHERE id = ? AND activa = 1
      `,
      [sesionActiva.id]
    );

    console.log(`SESION: Cerrada sesion_id=${sesionActiva.id} usuario_id=${usuarioId}`);

    // 3. Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'sesiones',
        registro_id: sesionActiva.id!,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activa: true, fecha_fin: null },
        datos_nuevos: { activa: false, fecha_fin: new Date() },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Forzar cierre de sesión (ADMIN)
   */
  static async forzarCierre(sesionId: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    // 1. Obtener la sesión
    const sesion = await this.getById(sesionId);
    if (!sesion) {
      throw new Error('Sesión no encontrada');
    }

    if (!sesion.activa) {
      throw new Error('La sesión ya está cerrada');
    }

    // 2. Cerrar la sesión
    const [result] = await pool.query<ResultSetHeader>(
      `
      UPDATE sesiones 
      SET activa = 0, fecha_fin = NOW() 
      WHERE id = ?
      `,
      [sesionId]
    );

    console.log(
      `SESION: Forzado cierre sesion_id=${sesionId} ` +
      `por admin=${auditoria.usuario_nombre}`
    );

    // 3. Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'sesiones',
        registro_id: sesionId,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activa: true, fecha_fin: null },
        datos_nuevos: { 
          activa: false, 
          fecha_fin: new Date(),
          nota: `Cierre forzado por ${auditoria.usuario_nombre}`
        },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Obtener sesiones activas (todas)
   */
  static async getSesionesActivas(): Promise<SesionDetallada[]> {
    return this.getAll({ activa: true });
  }

  /**
   * Obtener historial de sesiones de un usuario
   */
  static async getHistorialUsuario(
    usuarioId: number,
    limite: number = 20
  ): Promise<SesionDetallada[]> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        s.id,
        s.usuario_id,
        s.empresa_id,
        s.ubicacion_id,
        s.punto_venta_id,
        s.fecha_inicio,
        s.fecha_fin,
        s.activa,
        s.ip_address,
        s.user_agent,
        u.nombre_usuario AS usuario_nombre,
        u.email AS usuario_email,
        e.nombre AS empresa_nombre,
        ub.nombre AS ubicacion_nombre,
        ub.codigo AS ubicacion_codigo,
        pv.nombre AS punto_venta_nombre,
        pv.codigo AS punto_venta_codigo,
        pv.tipo_id AS punto_venta_tipo_id,
        tpv.codigo AS punto_venta_tipo_codigo,
        tpv.nombre AS punto_venta_tipo_nombre,
        tpv.icono AS punto_venta_tipo_icono,
        tpv.color AS punto_venta_tipo_color
      FROM sesiones s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN empresas e ON s.empresa_id = e.id
      INNER JOIN ubicaciones ub ON s.ubicacion_id = ub.id
      INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id
      INNER JOIN tipos_punto_venta tpv ON pv.tipo_id = tpv.id
      WHERE s.usuario_id = ?
      ORDER BY s.fecha_inicio DESC
      LIMIT ?
      `,
      [usuarioId, limite]
    );

    return rows.map(row => this.mapRowToSesion(row));
  }

  /**
   * Obtener estadísticas de sesiones
   */
  static async getEstadisticas(filters?: {
    usuario_id?: number;
    ubicacion_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    const pool = getPool('local');

    let query = `
      SELECT
        COUNT(*) AS total_sesiones,
        SUM(CASE WHEN activa = 1 THEN 1 ELSE 0 END) AS sesiones_activas,
        SUM(CASE WHEN activa = 0 THEN 1 ELSE 0 END) AS sesiones_cerradas,
        AVG(CASE 
          WHEN fecha_fin IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, fecha_inicio, fecha_fin) 
          ELSE NULL 
        END) AS duracion_promedio_minutos
      FROM sesiones
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.usuario_id) {
      query += ' AND usuario_id = ?';
      params.push(filters.usuario_id);
    }

    if (filters?.ubicacion_id) {
      query += ' AND ubicacion_id = ?';
      params.push(filters.ubicacion_id);
    }

    if (filters?.fecha_desde) {
      query += ' AND fecha_inicio >= ?';
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      query += ' AND fecha_inicio <= ?';
      params.push(filters.fecha_hasta);
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows[0];
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToSesion(row: any): SesionDetallada {
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      empresa_id: row.empresa_id,
      ubicacion_id: row.ubicacion_id,
      punto_venta_id: row.punto_venta_id,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      activa: !!row.activa,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      usuario_nombre: row.usuario_nombre,
      usuario_email: row.usuario_email,
      empresa_nombre: row.empresa_nombre,
      ubicacion_nombre: row.ubicacion_nombre,
      ubicacion_codigo: row.ubicacion_codigo,
      punto_venta_nombre: row.punto_venta_nombre,
      punto_venta_codigo: row.punto_venta_codigo,
      punto_venta_tipo_id: row.punto_venta_tipo_id,
      punto_venta_tipo_codigo: row.punto_venta_tipo_codigo,
      punto_venta_tipo_nombre: row.punto_venta_tipo_nombre,
      punto_venta_tipo_icono: row.punto_venta_tipo_icono,
      punto_venta_tipo_color: row.punto_venta_tipo_color
    };
  }

  /**
   * Obtener historial de auditoría
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('sesiones', id);
  }
}
