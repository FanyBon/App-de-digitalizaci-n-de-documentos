// src/models/loggin/Session.ts
import { getPool } from '../../config/db_controlcomidas';
import { v4 as uuidv4 } from 'uuid';

export interface PuntoVentaDisponible {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

export interface UbicacionInfo {
  id: number;
  nombre: string;
  codigo: string;
}

export interface SesionContexto {
  sesion_id: number;
  sesion_token: string;
  usuario_id: number;
  usuario_nombre: string;
  empresa_id: number;
  ubicacion_id: number;
  ubicacion_nombre: string;
  punto_venta_id: number;
  punto_venta_nombre: string;
  punto_venta_codigo: string;
  last_activity?: Date;
}

// Configuración de sesiones
const SESSION_CONFIG = {
  IDLE_TIMEOUT_HOURS: 8  // Inactividad máxima: 8 horas
};

export class Session {
  /**
   * Obtener puntos de venta disponibles de una ubicación
   * Valida que el usuario tenga acceso a esa ubicación
   */
  static async getPuntosVenta(
    usuarioId: number,
    ubicacionId: number
  ): Promise<{ ubicacion: UbicacionInfo; puntos_venta: PuntoVentaDisponible[] }> {
    const pool = getPool('local');

    // 1) Validar que el usuario tiene acceso a esta ubicación
    const [accessRows]: any = await pool.query(
      `
      SELECT 1 
      FROM usuario_ubicaciones 
      WHERE usuario_id = ? 
        AND ubicacion_id = ? 
        AND activo = 1
      `,
      [usuarioId, ubicacionId]
    );

    if (!Array.isArray(accessRows) || accessRows.length === 0) {
      throw new Error('No tienes acceso a esta ubicación');
    }

    // 2) Obtener info de la ubicación
    const [ubicacionRows]: any = await pool.query(
      `
      SELECT id, nombre, codigo
      FROM ubicaciones
      WHERE id = ? AND activo = 1
      `,
      [ubicacionId]
    );

    if (!Array.isArray(ubicacionRows) || ubicacionRows.length === 0) {
      throw new Error('Ubicación no encontrada o inactiva');
    }

    const ubicacion: UbicacionInfo = ubicacionRows[0];

    // 3) Obtener puntos de venta de esa ubicación
    const [pvRows]: any = await pool.query(
      `
      SELECT id, codigo, nombre, tipo, activo
      FROM puntos_venta
      WHERE ubicacion_id = ? 
        AND activo = 1
      ORDER BY nombre
      `,
      [ubicacionId]
    );

    const puntos_venta: PuntoVentaDisponible[] = (pvRows || []).map((pv: any) => ({
      id: pv.id,
      codigo: pv.codigo,
      nombre: pv.nombre,
      tipo: pv.tipo,
      activo: !!pv.activo
    }));

    console.log(
      `SESSION: usuario_id=${usuarioId} obtuvo ${puntos_venta.length} puntos de venta ` +
      `de ubicacion_id=${ubicacionId}`
    );

    return { ubicacion, puntos_venta };
  }

  /**
   * Crear una sesión operativa
   * IMPORTANTE: Cierra automáticamente cualquier sesión anterior del mismo usuario
   */
  static async createSession(
    usuarioId: number,
    ubicacionId: number,
    puntoVentaId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SesionContexto> {
    const pool = getPool('local');

    // 1) Validar que el punto de venta pertenece a la ubicación
    const [pvRows]: any = await pool.query(
      `
      SELECT 1 
      FROM puntos_venta 
      WHERE id = ? 
        AND ubicacion_id = ? 
        AND activo = 1
      `,
      [puntoVentaId, ubicacionId]
    );

    if (!Array.isArray(pvRows) || pvRows.length === 0) {
      throw new Error('Punto de venta no válido para esta ubicación');
    }

    // 2) ⭐ CERRAR TODAS LAS SESIONES ANTERIORES DEL USUARIO
    const [closedSessions]: any = await pool.query(
      `
      UPDATE sesiones_usuario 
      SET activa = 0, 
          fecha_fin = NOW() 
      WHERE usuario_id = ? 
        AND activa = 1
      `,
      [usuarioId]
    );

    const closedCount = closedSessions?.affectedRows ?? 0;
    if (closedCount > 0) {
      console.log(
        `SESSION: Cerradas automáticamente ${closedCount} sesión(es) anterior(es) ` +
        `de usuario_id=${usuarioId} (nueva sesión en punto_venta_id=${puntoVentaId})`
      );
    }

    // 3) Generar token único de sesión
    const sessionToken = `sess_${uuidv4()}`;

    // 4) Insertar nueva sesión en BD (last_activity se auto-inicializa con CURRENT_TIMESTAMP)
    const [insertResult]: any = await pool.query(
      `
      INSERT INTO sesiones_usuario (
        token, usuario_id, ubicacion_id, punto_venta_id, 
        ip_address, user_agent, activa
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
      [sessionToken, usuarioId, ubicacionId, puntoVentaId, ipAddress || null, userAgent || null]
    );

    const sesionId = insertResult.insertId;

    // 5) Obtener contexto completo de la sesión
    const [contextoRows]: any = await pool.query(
      `
      SELECT 
        s.id AS sesion_id,
        s.token AS sesion_token,
        s.usuario_id,
        u.nombre_usuario AS usuario_nombre,
        u.empresa_id,
        s.ubicacion_id,
        ub.nombre AS ubicacion_nombre,
        s.punto_venta_id,
        pv.codigo AS punto_venta_codigo,
        pv.nombre AS punto_venta_nombre,
        s.last_activity
      FROM sesiones_usuario s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN ubicaciones ub ON s.ubicacion_id = ub.id
      INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id
      WHERE s.id = ?
      `,
      [sesionId]
    );

    if (!Array.isArray(contextoRows) || contextoRows.length === 0) {
      throw new Error('Error al crear sesión');
    }

    const contexto: SesionContexto = contextoRows[0];

    console.log(
      `SESSION: sesión creada sesion_id=${sesionId} token=${sessionToken} ` +
      `usuario_id=${usuarioId} ubicacion_id=${ubicacionId} punto_venta_id=${puntoVentaId}`
    );

    return contexto;
  }

  /**
   * Obtener sesión activa por token
   * Valida que no haya expirado por inactividad (8 horas)
   * Y ACTUALIZA last_activity automáticamente
   */
  static async getActiveSession(sessionToken: string): Promise<SesionContexto | null> {
    const pool = getPool('local');

    // 1) Buscar sesión activa y validar inactividad
    const [rows]: any = await pool.query(
      `
      SELECT 
        s.id AS sesion_id,
        s.token AS sesion_token,
        s.usuario_id,
        u.nombre_usuario AS usuario_nombre,
        u.empresa_id,
        s.ubicacion_id,
        ub.nombre AS ubicacion_nombre,
        s.punto_venta_id,
        pv.codigo AS punto_venta_codigo,
        pv.nombre AS punto_venta_nombre,
        s.last_activity,
        TIMESTAMPDIFF(HOUR, s.last_activity, NOW()) AS horas_inactivo
      FROM sesiones_usuario s
      INNER JOIN usuarios u ON s.usuario_id = u.id
      INNER JOIN ubicaciones ub ON s.ubicacion_id = ub.id
      INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id
      WHERE s.token = ? 
        AND s.activa = 1
      `,
      [sessionToken]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const sesion = rows[0];

    // 2) Verificar si ha estado inactiva más de 8 horas
    if (sesion.horas_inactivo >= SESSION_CONFIG.IDLE_TIMEOUT_HOURS) {
      // Cerrar la sesión por inactividad
      await pool.query(
        `
        UPDATE sesiones_usuario 
        SET activa = 0, fecha_fin = NOW() 
        WHERE token = ?
        `,
        [sessionToken]
      );

      console.log(
        `SESSION: Sesión cerrada por inactividad (${sesion.horas_inactivo} horas) ` +
        `token=${sessionToken} usuario_id=${sesion.usuario_id}`
      );

      return null;
    }

    // 3) ⭐ ACTUALIZAR last_activity (la sesión se está usando AHORA)
    await pool.query(
      `
      UPDATE sesiones_usuario 
      SET last_activity = NOW() 
      WHERE token = ?
      `,
      [sessionToken]
    );

    // Remover el campo temporal horas_inactivo antes de retornar
    delete sesion.horas_inactivo;

    return sesion;
  }

  /**
   * Cerrar sesión activa (logout manual)
   */
  static async closeSession(sessionToken: string): Promise<boolean> {
    const pool = getPool('local');

    const [result]: any = await pool.query(
      `
      UPDATE sesiones_usuario 
      SET activa = 0, 
          fecha_fin = NOW() 
      WHERE token = ? 
        AND activa = 1
      `,
      [sessionToken]
    );

    const affectedRows = result.affectedRows || 0;

    if (affectedRows > 0) {
      console.log(`SESSION: Sesión cerrada manualmente token=${sessionToken}`);
      return true;
    }

    return false;
  }

  /**
   * Cerrar todas las sesiones de un usuario (útil para logout global o seguridad)
   */
  static async closeAllUserSessions(usuarioId: number): Promise<number> {
    const pool = getPool('local');

    const [result]: any = await pool.query(
      `
      UPDATE sesiones_usuario 
      SET activa = 0, 
          fecha_fin = NOW() 
      WHERE usuario_id = ? 
        AND activa = 1
      `,
      [usuarioId]
    );

    const closedCount = result.affectedRows || 0;

    if (closedCount > 0) {
      console.log(`SESSION: Cerradas ${closedCount} sesión(es) de usuario_id=${usuarioId}`);
    }

    return closedCount;
  }
}