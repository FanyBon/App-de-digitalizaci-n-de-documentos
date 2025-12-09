// src/middlewares/sessionMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { Session, SesionContexto } from '../models/loggin/Session';

// Extender el Request para incluir session
declare global {
  namespace Express {
    interface Request {
      session?: SesionContexto;
    }
  }
}

/**
 * Middleware para validar que existe una sesión activa
 * Debe usarse DESPUÉS de verifyToken
 */
export const requireActiveSession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const sessionToken = req.get('X-Session-Token');

  if (!sessionToken) {
    throw new createError.BadRequest(
      'X-Session-Token header es obligatorio para esta operación'
    );
  }

  try {
    const sesion = await Session.getActiveSession(sessionToken);

    if (!sesion) {
      throw new createError.Unauthorized(
        'Sesión no válida o expirada. Por favor inicia sesión nuevamente.'
      );
    }

    // Validar que la sesión pertenece al usuario autenticado
    if (req.user && sesion.usuario_id !== req.user.id) {
      throw new createError.Forbidden(
        'La sesión no pertenece al usuario autenticado'
      );
    }

    // Inyectar sesión en el request
    req.session = sesion;
    console.log(
      `SESSION-MIDDLEWARE: Sesión validada para usuario_id=${sesion.usuario_id} ` +
      `en punto_venta_id=${sesion.punto_venta_id}`
    );
    next();

  } catch (error) {
    // Si el error ya es de http-errors, lo propagamos
    if (createError.isHttpError(error)) {
      next(error);
    } else {
      console.error('Error en requireActiveSession:', error);
      next(new createError.InternalServerError('Error al validar sesión'));
    }
  }
};