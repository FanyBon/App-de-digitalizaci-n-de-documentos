// src/controllers/loggin/authController.ts
import { Request, Response } from 'express';
import validator from 'validator';
import { Auth, AuthResponse } from '../../models/loggin/Auth';
import { Session } from '../../models/loggin/Session';

/**
 * POST /api/login
 * Body: { emailOrUsername, password }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { emailOrUsername, password } = req.body;

  // validar campos obligatorios
  if (!emailOrUsername || !password) {
    console.warn('Faltan campos obligatorios en el login.');
    res
      .status(400)
      .json({ error: 'Email/Usuario y contraseña son obligatorios' });
    return;
  }

  // validar formato (email o alfanumérico)
  const isValidInput =
    validator.isEmail(emailOrUsername) ||
    validator.isAlphanumeric(emailOrUsername);
  if (!isValidInput) {
    console.warn('Entrada inválida para email o nombre de usuario.');
    res
      .status(400)
      .json({ error: 'El email o nombre de usuario no es válido' });
    return;
  }

  try {
    // intentar login
    const result: AuthResponse = await Auth.login(emailOrUsername, password);
    console.log(`Intento de login exitoso para: ${emailOrUsername}`);
    res.status(200).json(result); // incluye token, datos, roles, perfiles Y ubicaciones

  } catch (error: any) {
    console.error(`Intento de login fallido para: ${emailOrUsername}`, error);

    // mapear errores a códigos HTTP adecuados
    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Credenciales inválidas') {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

/**
 * POST /api/auth/select-ubicacion
 * Body: { ubicacion_id }
 * Headers: Authorization: Bearer <token>
 */
export const selectUbicacion = async (req: Request, res: Response): Promise<void> => {
  const { ubicacion_id } = req.body;

  // Validar campos obligatorios
  if (!ubicacion_id) {
    res.status(400).json({ error: 'ubicacion_id es obligatorio' });
    return;
  }

  // Validar que sea un número
  if (!Number.isInteger(Number(ubicacion_id))) {
    res.status(400).json({ error: 'ubicacion_id debe ser un número válido' });
    return;
  }

  try {
    // req.user viene del middleware verifyToken
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Obtener ubicación y puntos de venta disponibles
    const { ubicacion, puntos_venta } = await Session.getPuntosVenta(
      usuarioId,
      Number(ubicacion_id)
    );

    console.log(
      `SELECT-UBICACION: usuario_id=${usuarioId} seleccionó ubicacion_id=${ubicacion_id}`
    );

    res.status(200).json({
      ubicacion,
      puntos_venta_disponibles: puntos_venta
    });

  } catch (error: any) {
    console.error('Error en selectUbicacion:', error);

    if (error.message === 'No tienes acceso a esta ubicación') {
      res.status(403).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada o inactiva') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

/**
 * POST /api/auth/select-punto-venta
 * Body: { ubicacion_id, punto_venta_id }
 * Headers: Authorization: Bearer <token>
 */
export const selectPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  const { ubicacion_id, punto_venta_id } = req.body;

  // Validar campos obligatorios
  if (!ubicacion_id || !punto_venta_id) {
    res.status(400).json({ 
      error: 'ubicacion_id y punto_venta_id son obligatorios' 
    });
    return;
  }

  // Validar que sean números
  if (
    !Number.isInteger(Number(ubicacion_id)) ||
    !Number.isInteger(Number(punto_venta_id))
  ) {
    res.status(400).json({ 
      error: 'ubicacion_id y punto_venta_id deben ser números válidos' 
    });
    return;
  }

  try {
    // req.user viene del middleware verifyToken
    const usuarioId = req.user?.id;
    const empresaId = req.user?.empresa_id;

    if (!usuarioId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Obtener IP y User-Agent del request
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;

    // Crear sesión operativa
    const contexto = await Session.createSession(
      usuarioId,
      Number(ubicacion_id),
      Number(punto_venta_id),
      ipAddress,
      userAgent
    );

    console.log(
      `SELECT-PUNTO-VENTA: usuario_id=${usuarioId} ` +
      `creó sesión en punto_venta_id=${punto_venta_id}`
    );

    res.status(201).json({
      sesion_id: contexto.sesion_id,
      sesion_token: contexto.sesion_token,
      mensaje: 'Sesión iniciada correctamente',
      contexto: {
        usuario_id: contexto.usuario_id,
        usuario_nombre: contexto.usuario_nombre,
        empresa_id: empresaId,
        ubicacion_id: contexto.ubicacion_id,
        ubicacion_nombre: contexto.ubicacion_nombre,
        punto_venta_id: contexto.punto_venta_id,
        punto_venta_nombre: contexto.punto_venta_nombre,
        punto_venta_codigo: contexto.punto_venta_codigo
      }
    });

  } catch (error: any) {
    console.error('Error en selectPuntoVenta:', error);

    if (error.message === 'Punto de venta no válido para esta ubicación') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Error al crear sesión') {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

/**
 * POST /api/auth/logout
 * Body: { sesion_token }
 * Headers: Authorization: Bearer <token>
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { sesion_token } = req.body;

  // Validar campo obligatorio
  if (!sesion_token) {
    res.status(400).json({ error: 'sesion_token es obligatorio' });
    return;
  }

  try {
    const closed = await Session.closeSession(sesion_token);

    if (closed) {
      console.log(`LOGOUT: sesión cerrada token=${sesion_token}`);
      res.status(200).json({ 
        mensaje: 'Sesión cerrada correctamente' 
      });
    } else {
      res.status(404).json({ 
        error: 'Sesión no encontrada o ya cerrada' 
      });
    }

  } catch (error: any) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/auth/session-status
 * Headers: 
 *   Authorization: Bearer <token>
 *   X-Session-Token: <sesion_token>
 */
export const getSessionStatus = async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.get('X-Session-Token');

  if (!sessionToken) {
    res.status(400).json({ error: 'X-Session-Token header es obligatorio' });
    return;
  }

  try {
    const sesion = await Session.getActiveSession(sessionToken);

    if (!sesion) {
      res.status(404).json({ 
        error: 'Sesión no encontrada o expirada',
        activa: false 
      });
      return;
    }

    res.status(200).json({
      activa: true,
      contexto: {
        sesion_id: sesion.sesion_id,
        usuario_id: sesion.usuario_id,
        usuario_nombre: sesion.usuario_nombre,
        empresa_id: sesion.empresa_id,
        ubicacion_id: sesion.ubicacion_id,
        ubicacion_nombre: sesion.ubicacion_nombre,
        punto_venta_id: sesion.punto_venta_id,
        punto_venta_nombre: sesion.punto_venta_nombre,
        punto_venta_codigo: sesion.punto_venta_codigo
      }
    });

  } catch (error: any) {
    console.error('Error en getSessionStatus:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};