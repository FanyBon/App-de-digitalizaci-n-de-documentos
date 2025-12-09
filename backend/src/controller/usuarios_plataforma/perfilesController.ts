// src/controller/usuarios_plataforma/perfilesController.ts
import { Request, Response } from 'express';
import { Perfil } from '../../models/usuarios_plataforma/Perfil';

/** Helper: Extraer contexto de auditoría */
function getAuditoriaContext(req: Request) {
  return {
    usuario_id: req.user!.id,
    usuario_nombre: req.user!.nombre_usuario,
    ip: req.ip || req.socket.remoteAddress,
    user_agent: req.get('user-agent')
  };
}

/**
 * GET /api/perfiles
 * Listar todos los perfiles con filtros
 */
export const listarPerfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    if (req.query.es_sistema !== undefined) {
      filters.es_sistema = req.query.es_sistema === 'true';
    }

    const perfiles = await Perfil.getAll(filters);

    res.status(200).json({
      total: perfiles.length,
      data: perfiles
    });
  } catch (error: any) {
    console.error('Error en listarPerfiles:', error);
    res.status(500).json({ error: 'Error al listar perfiles' });
  }
};

/**
 * GET /api/perfiles/:id
 * Obtener perfil por ID con estadísticas
 */
export const obtenerPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const perfil = await Perfil.getById(id);

    if (!perfil) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    res.status(200).json(perfil);
  } catch (error: any) {
    console.error('Error en obtenerPerfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

/**
 * POST /api/perfiles
 * Crear nuevo perfil
 */
export const crearPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;

    // Validaciones
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({ error: 'El nombre del perfil es obligatorio' });
      return;
    }

    const perfilId = await Perfil.create(
      {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || ''
      },
      getAuditoriaContext(req)
    );

    const perfilCreado = await Perfil.getById(perfilId);

    res.status(201).json({
      mensaje: 'Perfil creado exitosamente',
      data: perfilCreado
    });

    console.log(`✅ PERFIL: Creado perfil_id=${perfilId} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en crearPerfil:', error);

    if (error.message === 'Ya existe un perfil con ese nombre') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear perfil' });
    }
  }
};

/**
 * PUT /api/perfiles/:id
 * Actualizar perfil
 */
export const editarPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { nombre, descripcion } = req.body;

    // Validar que al menos un campo venga
    if (!nombre && !descripcion) {
      res.status(400).json({ error: 'Debe proporcionar al menos nombre o descripcion' });
      return;
    }

    const updated = await Perfil.update(
      id,
      {
        nombre: nombre?.trim(),
        descripcion: descripcion?.trim()
      },
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Perfil no encontrado o sin cambios' });
      return;
    }

    const perfilActualizado = await Perfil.getById(id);

    res.status(200).json({
      mensaje: 'Perfil actualizado exitosamente',
      data: perfilActualizado
    });

    console.log(`✅ PERFIL: Actualizado perfil_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en editarPerfil:', error);

    if (error.message === 'Perfil no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Ya existe un perfil con ese nombre') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'No se puede cambiar el nombre de un perfil del sistema') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  }
};

/**
 * PATCH /api/perfiles/:id/status
 * Cambiar estado (activar/inactivar)
 */
export const cambiarEstatusPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { activo } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (typeof activo !== 'boolean') {
      res.status(400).json({ error: 'El campo activo debe ser un booleano' });
      return;
    }

    const changed = await Perfil.changeStatus(id, activo, getAuditoriaContext(req));

    if (!changed) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const perfilActualizado = await Perfil.getById(id);

    res.status(200).json({
      mensaje: `Perfil ${activo ? 'activado' : 'inactivado'} exitosamente`,
      data: perfilActualizado
    });

    console.log(`✅ PERFIL: Estatus cambiado perfil_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

  } catch (error: any) {
    console.error('Error en cambiarEstatusPerfil:', error);

    if (error.message.includes('ya está')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede inactivar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar estado del perfil' });
    }
  }
};

/**
 * DELETE /api/perfiles/:id
 * Eliminar físicamente (solo perfiles personalizados)
 */
export const eliminarPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Perfil.delete(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    res.status(200).json({
      mensaje: 'Perfil eliminado exitosamente'
    });

    console.log(`✅ PERFIL: Eliminado perfil_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en eliminarPerfil:', error);

    if (error.message === 'Perfil no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar perfil' });
    }
  }
};

/**
 * GET /api/perfiles/:id/historial
 * Obtener historial de auditoría
 */
export const obtenerHistorialPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    // Verificar que el perfil existe
    const perfil = await Perfil.getById(id);
    if (!perfil) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }

    const historial = await Perfil.getHistorial(id);

    res.status(200).json({
      perfil_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialPerfil:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};