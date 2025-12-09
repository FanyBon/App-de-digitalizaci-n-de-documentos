// src/controllers/usuarios/usuarioUbicacionesController.ts
import { Request, Response, NextFunction } from 'express';
import { UsuarioUbicacion } from '../../../models/usuarios_plataforma/usuario_ubicacion/UsuarioUbicacion';

// Helper para extraer datos del usuario
const obtenerDatosUsuario = (req: Request) => {
  const userId = req.user?.id || 0;
  const userName = req.user?.nombre_usuario || 'Sistema';
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                    req.socket.remoteAddress || 
                    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { userId, userName, ipAddress, userAgent };
};

// ====================================
// CONSULTAS
// ====================================

export const getUsuarioUbicaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asignaciones = await UsuarioUbicacion.getAll();

    res.status(200).json({
      total: asignaciones.length,
      data: asignaciones
    });
  } catch (error: any) {
    console.error('❌ Error en getUsuarioUbicaciones:', error);
    next(error);
  }
};

export const getUsuarioUbicacionesByUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'Usuario ID inválido' });
      return;
    }

    const asignaciones = await UsuarioUbicacion.getByUsuario(usuarioId);

    res.status(200).json({
      usuario_id: usuarioId,
      total: asignaciones.length,
      ubicaciones: asignaciones
    });
  } catch (error: any) {
    console.error('❌ Error en getUsuarioUbicacionesByUsuario:', error);
    next(error);
  }
};

export const getUsuarioUbicacionesByUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ubicacionId = Number(req.params.ubicacionId);

    if (isNaN(ubicacionId)) {
      res.status(400).json({ error: 'Ubicación ID inválido' });
      return;
    }

    const asignaciones = await UsuarioUbicacion.getByUbicacion(ubicacionId);

    res.status(200).json({
      ubicacion_id: ubicacionId,
      total: asignaciones.length,
      usuarios: asignaciones
    });
  } catch (error: any) {
    console.error('❌ Error en getUsuarioUbicacionesByUbicacion:', error);
    next(error);
  }
};

export const getUsuarioUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const asignacion = await UsuarioUbicacion.getById(id);

    if (!asignacion) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    res.status(200).json(asignacion);
  } catch (error: any) {
    console.error('❌ Error en getUsuarioUbicacion:', error);
    next(error);
  }
};

export const getHistorialUsuarioUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const historial = await UsuarioUbicacion.getHistorial(id);

    res.status(200).json({
      asignacion_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('❌ Error en getHistorialUsuarioUbicacion:', error);
    next(error);
  }
};

// ====================================
// MODIFICACIÓN
// ====================================

export const createUsuarioUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { usuario_id, ubicacion_id, activo } = req.body;

    if (!usuario_id || !ubicacion_id) {
      res.status(400).json({ 
        error: 'Campos obligatorios: usuario_id, ubicacion_id' 
      });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const asignacionId = await UsuarioUbicacion.create(
      {
        usuario_id,
        ubicacion_id,
        asignado_por: userId,
        activo
      },
      userId,
      userName,
      ipAddress,
      userAgent
    );

    const nuevaAsignacion = await UsuarioUbicacion.getById(asignacionId);

    res.status(201).json({
      message: 'Asignación creada exitosamente',
      data: nuevaAsignacion
    });
  } catch (error: any) {
    console.error('❌ Error en createUsuarioUbicacion:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El usuario ya está asignado a esta ubicación') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear asignación' });
    }
  }
};

export const updateUsuarioUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { activo } = req.body;
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const updated = await UsuarioUbicacion.update(
      id,
      { activo },
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!updated) {
      res.status(404).json({ error: 'Asignación no encontrada o sin cambios' });
      return;
    }

    const asignacionActualizada = await UsuarioUbicacion.getById(id);

    res.status(200).json({
      message: 'Asignación actualizada exitosamente',
      data: asignacionActualizada
    });
  } catch (error: any) {
    console.error('❌ Error en updateUsuarioUbicacion:', error);

    if (error.message === 'Asignación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar asignación' });
    }
  }
};

export const activateUsuarioUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const activated = await UsuarioUbicacion.activate(
      id,
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!activated) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    const asignacion = await UsuarioUbicacion.getById(id);

    res.status(200).json({
      message: 'Asignación activada exitosamente',
      data: asignacion
    });
  } catch (error: any) {
    console.error('❌ Error en activateUsuarioUbicacion:', error);

    if (error.message === 'La asignación ya está activa') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Asignación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al activar asignación' });
    }
  }
};

// ====================================
// ELIMINACIÓN
// ====================================

export const deleteUsuarioUbicacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const deleted = await UsuarioUbicacion.deactivate(
      id,
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!deleted) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    res.status(200).json({
      message: 'Asignación desactivada exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Error en deleteUsuarioUbicacion:', error);

    if (error.message === 'La asignación ya está inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Asignación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al desactivar asignación' });
    }
  }
};

export const deleteUsuarioUbicacionPermanent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const deleted = await UsuarioUbicacion.deletePermanently(
      id,
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!deleted) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    res.status(200).json({
      message: '⚠️ Asignación eliminada PERMANENTEMENTE de la base de datos'
    });
  } catch (error: any) {
    console.error('❌ Error en deleteUsuarioUbicacionPermanent:', error);

    if (error.message === 'Asignación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar asignación' });
    }
  }
};