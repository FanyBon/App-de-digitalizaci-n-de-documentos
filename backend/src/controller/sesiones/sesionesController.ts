// src/controllers/sesiones/sesionesController.ts
import { Request, Response } from 'express';
import { Sesion } from '../../models/sesiones/Sesion';

/**
 * Helper: Extraer contexto de auditoría
 */
function getAuditoriaContext(req: Request) {
  return {
    usuario_id: req.user!.id,
    usuario_nombre: req.user!.nombre_usuario,
    ip: req.ip || req.socket.remoteAddress,
    user_agent: req.get('user-agent')
  };
}

/**
 * POST /api/sesiones/iniciar
 * Iniciar sesión operativa
 */
export const iniciarSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ubicacion_id, punto_venta_id } = req.body;

    if (!ubicacion_id || !punto_venta_id) {
      res.status(400).json({
        error: 'Campos obligatorios: ubicacion_id, punto_venta_id'
      });
      return;
    }

    const sesionId = await Sesion.iniciar(
      {
        usuario_id: req.user!.id,
        ubicacion_id,
        punto_venta_id
      },
      getAuditoriaContext(req)
    );

    const sesion = await Sesion.getById(sesionId);

    res.status(201).json({
      mensaje: 'Sesión operativa iniciada exitosamente',
      data: sesion
    });
  } catch (error: any) {
    console.error('Error en iniciarSesion:', error);

    if (error.message.includes('Ya tienes una sesión activa')) {
      res.status(409).json({ error: error.message });
    } else if (error.message.includes('no encontrado')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('inactiv')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No tienes acceso')) {
      res.status(403).json({ error: error.message });
    } else if (error.message.includes('está siendo usado')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al iniciar sesión operativa' });
    }
  }
};

/**
 * POST /api/sesiones/cerrar
 * Cerrar sesión operativa del usuario autenticado
 */
export const cerrarSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const cerrada = await Sesion.cerrar(req.user!.id, getAuditoriaContext(req));

    if (!cerrada) {
      res.status(400).json({ error: 'No se pudo cerrar la sesión' });
      return;
    }

    res.status(200).json({
      mensaje: 'Sesión operativa cerrada exitosamente'
    });
  } catch (error: any) {
    console.error('Error en cerrarSesion:', error);

    if (error.message === 'No tienes ninguna sesión activa') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cerrar sesión operativa' });
    }
  }
};

/**
 * GET /api/sesiones/mi-sesion
 * Obtener sesión activa del usuario autenticado
 */
export const getMiSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const sesion = await Sesion.getSesionActiva(req.user!.id);

    if (!sesion) {
      res.status(404).json({ 
        mensaje: 'No tienes una sesión operativa activa',
        data: null 
      });
      return;
    }

    res.status(200).json({
      mensaje: 'Sesión activa encontrada',
      data: sesion
    });
  } catch (error: any) {
    console.error('Error en getMiSesion:', error);
    res.status(500).json({ error: 'Error al obtener sesión activa' });
  }
};

/**
 * GET /api/sesiones
 * Listar sesiones con filtros
 */
export const getSesiones = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.usuario_id) {
      filters.usuario_id = Number(req.query.usuario_id);
    }

    if (req.query.ubicacion_id) {
      filters.ubicacion_id = Number(req.query.ubicacion_id);
    }

    if (req.query.punto_venta_id) {
      filters.punto_venta_id = Number(req.query.punto_venta_id);
    }

    if (req.query.empresa_id) {
      filters.empresa_id = Number(req.query.empresa_id);
    }

    if (req.query.activa !== undefined) {
      filters.activa = req.query.activa === 'true';
    }

    if (req.query.fecha_desde) {
      filters.fecha_desde = req.query.fecha_desde as string;
    }

    if (req.query.fecha_hasta) {
      filters.fecha_hasta = req.query.fecha_hasta as string;
    }

    const sesiones = await Sesion.getAll(filters);

    res.status(200).json({
      total: sesiones.length,
      data: sesiones
    });
  } catch (error: any) {
    console.error('Error en getSesiones:', error);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
};

/**
 * GET /api/sesiones/activas
 * Listar todas las sesiones activas
 */
export const getSesionesActivas = async (req: Request, res: Response): Promise<void> => {
  try {
    const sesiones = await Sesion.getSesionesActivas();

    res.status(200).json({
      total: sesiones.length,
      data: sesiones
    });
  } catch (error: any) {
    console.error('Error en getSesionesActivas:', error);
    res.status(500).json({ error: 'Error al obtener sesiones activas' });
  }
};

/**
 * GET /api/sesiones/:id
 * Obtener sesión por ID
 */
export const getSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const sesion = await Sesion.getById(id);

    if (!sesion) {
      res.status(404).json({ error: 'Sesión no encontrada' });
      return;
    }

    res.status(200).json(sesion);
  } catch (error: any) {
    console.error('Error en getSesion:', error);
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
};

/**
 * GET /api/sesiones/usuario/:usuarioId/historial
 * Obtener historial de sesiones de un usuario
 */
export const getHistorialUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'Usuario ID inválido' });
      return;
    }

    const limite = req.query.limite ? Number(req.query.limite) : 20;

    const historial = await Sesion.getHistorialUsuario(usuarioId, limite);

    res.status(200).json({
      usuario_id: usuarioId,
      total: historial.length,
      data: historial
    });
  } catch (error: any) {
    console.error('Error en getHistorialUsuario:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

/**
 * POST /api/sesiones/:id/forzar-cierre
 * Forzar cierre de sesión (ADMIN)
 */
export const forzarCierreSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const cerrada = await Sesion.forzarCierre(id, getAuditoriaContext(req));

    if (!cerrada) {
      res.status(400).json({ error: 'No se pudo cerrar la sesión' });
      return;
    }

    res.status(200).json({
      mensaje: 'Sesión cerrada forzadamente por administrador'
    });
  } catch (error: any) {
    console.error('Error en forzarCierreSesion:', error);

    if (error.message === 'Sesión no encontrada') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'La sesión ya está cerrada') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al forzar cierre de sesión' });
    }
  }
};

/**
 * GET /api/sesiones/estadisticas
 * Obtener estadísticas de sesiones
 */
export const getEstadisticas = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.usuario_id) {
      filters.usuario_id = Number(req.query.usuario_id);
    }

    if (req.query.ubicacion_id) {
      filters.ubicacion_id = Number(req.query.ubicacion_id);
    }

    if (req.query.fecha_desde) {
      filters.fecha_desde = req.query.fecha_desde as string;
    }

    if (req.query.fecha_hasta) {
      filters.fecha_hasta = req.query.fecha_hasta as string;
    }

    const estadisticas = await Sesion.getEstadisticas(filters);

    res.status(200).json(estadisticas);
  } catch (error: any) {
    console.error('Error en getEstadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * GET /api/sesiones/:id/historial
 * Ver historial de auditoría de una sesión
 */
export const getHistorialSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const historial = await Sesion.getHistorial(id);

    res.status(200).json({
      sesion_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en getHistorialSesion:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};