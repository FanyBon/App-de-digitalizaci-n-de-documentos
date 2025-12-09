// src/controllers/empresa/ubicacionesController.ts
import { Request, Response } from 'express';
import { Ubicacion } from '../../models/empresa/Ubicacion';

/**
 * Helper: Extraer contexto de auditoría del request
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
 * GET /api/ubicaciones
 */
export const getUbicaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const empresaId = req.query.empresa_id ? Number(req.query.empresa_id) : undefined;

    const ubicaciones = await Ubicacion.getAll(empresaId);

    res.status(200).json({
      total: ubicaciones.length,
      data: ubicaciones
    });
  } catch (error: any) {
    console.error('Error en getUbicaciones:', error);
    res.status(500).json({ error: 'Error al obtener ubicaciones' });
  }
};

/**
 * GET /api/ubicaciones/:id
 */
export const getUbicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const ubicacion = await Ubicacion.getById(id);

    if (!ubicacion) {
      res.status(404).json({ error: 'Ubicación no encontrada' });
      return;
    }

    const stats = await Ubicacion.getStats(id);

    res.status(200).json({
      ...ubicacion,
      stats
    });
  } catch (error: any) {
    console.error('Error en getUbicacion:', error);
    res.status(500).json({ error: 'Error al obtener ubicación' });
  }
};

/**
 * POST /api/ubicaciones
 */
export const createUbicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empresa_id, nombre, codigo, direccion, telefono, activo } = req.body;

    if (!empresa_id || !nombre || !codigo) {
      res.status(400).json({ 
        error: 'Campos obligatorios: empresa_id, nombre, codigo' 
      });
      return;
    }

    const ubicacionId = await Ubicacion.create(
      { empresa_id, nombre, codigo, direccion, telefono, activo },
      getAuditoriaContext(req)
    );

    const nuevaUbicacion = await Ubicacion.getById(ubicacionId);

    res.status(201).json({
      mensaje: 'Ubicación creada exitosamente',
      data: nuevaUbicacion
    });
  } catch (error: any) {
    console.error('Error en createUbicacion:', error);

    if (error.message === 'Empresa no encontrada') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El código de ubicación ya existe') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear ubicación' });
    }
  }
};

/**
 * PUT /api/ubicaciones/:id
 */
export const updateUbicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { nombre, codigo, direccion, telefono, activo } = req.body;

    const updated = await Ubicacion.update(
      id,
      { nombre, codigo, direccion, telefono, activo },
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Ubicación no encontrada o sin cambios' });
      return;
    }

    const ubicacionActualizada = await Ubicacion.getById(id);

    res.status(200).json({
      mensaje: 'Ubicación actualizada exitosamente',
      data: ubicacionActualizada
    });
  } catch (error: any) {
    console.error('Error en updateUbicacion:', error);

    if (error.message === 'Ubicación no encontrada') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El código de ubicación ya existe') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar ubicación' });
    }
  }
};

/**
 * DELETE /api/ubicaciones/:id (soft delete)
 */
export const deleteUbicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Ubicacion.deactivate(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Ubicación no encontrada' });
      return;
    }

    res.status(200).json({
      mensaje: 'Ubicación desactivada exitosamente',
      nota: 'Para eliminarla permanentemente usa DELETE /api/ubicaciones/:id/permanent'
    });
  } catch (error: any) {
    console.error('Error en deleteUbicacion:', error);

    if (error.message === 'La ubicación ya está inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede desactivar')) {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al desactivar ubicación' });
    }
  }
};

/**
 * DELETE /api/ubicaciones/:id/permanent (hard delete)
 */
export const deleteUbicacionPermanent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Ubicacion.deletePermanently(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Ubicación no encontrada' });
      return;
    }

    res.status(200).json({
      mensaje: '⚠️ Ubicación eliminada PERMANENTEMENTE de la base de datos'
    });
  } catch (error: any) {
    console.error('Error en deleteUbicacionPermanent:', error);

    if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar ubicación' });
    }
  }
};

/**
 * PATCH /api/ubicaciones/:id/reactivate
 */
export const reactivateUbicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const reactivated = await Ubicacion.reactivate(id, getAuditoriaContext(req));

    if (!reactivated) {
      res.status(404).json({ error: 'Ubicación no encontrada' });
      return;
    }

    const ubicacion = await Ubicacion.getById(id);

    res.status(200).json({
      mensaje: 'Ubicación reactivada exitosamente',
      data: ubicacion
    });
  } catch (error: any) {
    console.error('Error en reactivateUbicacion:', error);

    if (error.message === 'La ubicación ya está activa') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al reactivar ubicación' });
    }
  }
};

/**
 * GET /api/ubicaciones/:id/historial
 */
export const getHistorialUbicacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const historial = await Ubicacion.getHistorial(id);

    res.status(200).json({
      ubicacion_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en getHistorialUbicacion:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};