// src/controller/usuarios_plataforma/rolesController.ts
import { Request, Response } from 'express';
import { Rol } from '../../models/usuarios_plataforma/Rol';

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
 * GET /api/roles
 * Listar todos los roles con filtros
 */
export const listarRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    if (req.query.es_sistema !== undefined) {
      filters.es_sistema = req.query.es_sistema === 'true';
    }

    const roles = await Rol.getAll(filters);

    res.status(200).json({
      total: roles.length,
      data: roles
    });
  } catch (error: any) {
    console.error('Error en listarRoles:', error);
    res.status(500).json({ error: 'Error al listar roles' });
  }
};

/**
 * GET /api/roles/:id
 * Obtener rol por ID con estadísticas
 */
export const obtenerRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const rol = await Rol.getById(id);

    if (!rol) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    res.status(200).json(rol);
  } catch (error: any) {
    console.error('Error en obtenerRol:', error);
    res.status(500).json({ error: 'Error al obtener rol' });
  }
};

/**
 * POST /api/roles
 * Crear nuevo rol
 */
export const crearRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;

    // Validaciones
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({ error: 'El nombre del rol es obligatorio' });
      return;
    }

    const rolId = await Rol.create(
      {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || ''
      },
      getAuditoriaContext(req)
    );

    const rolCreado = await Rol.getById(rolId);

    res.status(201).json({
      mensaje: 'Rol creado exitosamente',
      data: rolCreado
    });

    console.log(`✅ ROL: Creado rol_id=${rolId} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en crearRol:', error);

    if (error.message === 'Ya existe un rol con ese nombre') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear rol' });
    }
  }
};

/**
 * PUT /api/roles/:id
 * Actualizar rol
 */
export const editarRol = async (req: Request, res: Response): Promise<void> => {
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

    const updated = await Rol.update(
      id,
      {
        nombre: nombre?.trim(),
        descripcion: descripcion?.trim()
      },
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Rol no encontrado o sin cambios' });
      return;
    }

    const rolActualizado = await Rol.getById(id);

    res.status(200).json({
      mensaje: 'Rol actualizado exitosamente',
      data: rolActualizado
    });

    console.log(`✅ ROL: Actualizado rol_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en editarRol:', error);

    if (error.message === 'Rol no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Ya existe un rol con ese nombre') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'No se puede cambiar el nombre de un rol del sistema') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar rol' });
    }
  }
};

/**
 * PATCH /api/roles/:id/status
 * Cambiar estado (activar/inactivar)
 */
export const cambiarEstatusRol = async (req: Request, res: Response): Promise<void> => {
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

    const changed = await Rol.changeStatus(id, activo, getAuditoriaContext(req));

    if (!changed) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    const rolActualizado = await Rol.getById(id);

    res.status(200).json({
      mensaje: `Rol ${activo ? 'activado' : 'inactivado'} exitosamente`,
      data: rolActualizado
    });

    console.log(`✅ ROL: Estatus cambiado rol_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

  } catch (error: any) {
    console.error('Error en cambiarEstatusRol:', error);

    if (error.message.includes('ya está')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede inactivar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar estado del rol' });
    }
  }
};

/**
 * DELETE /api/roles/:id
 * Eliminar físicamente (solo roles personalizados)
 */
export const eliminarRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Rol.delete(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    res.status(200).json({
      mensaje: 'Rol eliminado exitosamente'
    });

    console.log(`✅ ROL: Eliminado rol_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en eliminarRol:', error);

    if (error.message === 'Rol no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar rol' });
    }
  }
};

/**
 * GET /api/roles/:id/historial
 * Obtener historial de auditoría
 */
export const obtenerHistorialRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    // Verificar que el rol existe
    const rol = await Rol.getById(id);
    if (!rol) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    const historial = await Rol.getHistorial(id);

    res.status(200).json({
      rol_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialRol:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};