// src/controller/permisos/permisosController.ts
import { Request, Response } from 'express';
import { Permiso } from '../../models/permisos/Permiso';

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
 * GET /api/permisos
 * Listar todos los permisos con filtros opcionales
 * Query params: ?modulo=usuarios&activo=true&es_sistema=false
 */
export const listarPermisos = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.modulo) {
      filters.modulo = req.query.modulo as string;
    }

    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    if (req.query.es_sistema !== undefined) {
      filters.es_sistema = req.query.es_sistema === 'true';
    }

    const permisos = await Permiso.getAll(filters);

    res.status(200).json({
      total: permisos.length,
      filtros_aplicados: filters,
      data: permisos
    });
  } catch (error: any) {
    console.error('Error en listarPermisos:', error);
    res.status(500).json({ error: 'Error al listar permisos' });
  }
};

/**
 * GET /api/permisos/modulos
 * Obtener lista de módulos únicos
 */
export const listarModulos = async (req: Request, res: Response): Promise<void> => {
  try {
    const modulos = await Permiso.getModulos();

    res.status(200).json({
      total: modulos.length,
      data: modulos
    });
  } catch (error: any) {
    console.error('Error en listarModulos:', error);
    res.status(500).json({ error: 'Error al listar módulos' });
  }
};

/**
 * GET /api/permisos/:id
 * Obtener permiso por ID
 */
export const obtenerPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const permiso = await Permiso.getById(id);

    if (!permiso) {
      res.status(404).json({ error: 'Permiso no encontrado' });
      return;
    }

    res.status(200).json(permiso);
  } catch (error: any) {
    console.error('Error en obtenerPermiso:', error);
    res.status(500).json({ error: 'Error al obtener permiso' });
  }
};

/**
 * POST /api/permisos
 * Crear nuevo permiso
 */
export const crearPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, nombre, descripcion, modulo, accion, metodo, ruta } = req.body;

    // Validaciones
    if (!codigo || typeof codigo !== 'string' || codigo.trim().length === 0) {
      res.status(400).json({ error: 'El código del permiso es obligatorio' });
      return;
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({ error: 'El nombre del permiso es obligatorio' });
      return;
    }

    if (!modulo || typeof modulo !== 'string' || modulo.trim().length === 0) {
      res.status(400).json({ error: 'El módulo es obligatorio' });
      return;
    }

    if (!accion || typeof accion !== 'string' || accion.trim().length === 0) {
      res.status(400).json({ error: 'La acción es obligatoria' });
      return;
    }

    const permisoId = await Permiso.create(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        modulo: modulo.trim(),
        accion: accion.trim(),
        metodo: metodo?.trim() || null,
        ruta: ruta?.trim() || null,
        es_sistema: false,
        activo: true
      },
      getAuditoriaContext(req)
    );

    const permisoCreado = await Permiso.getById(permisoId);

    res.status(201).json({
      mensaje: 'Permiso creado exitosamente',
      data: permisoCreado
    });

    console.log(`✓ PERMISO: Creado permiso_id=${permisoId} por usuario_id=${req.user!.id}`);
  } catch (error: any) {
    console.error('Error en crearPermiso:', error);

    if (error.message === 'Ya existe un permiso con ese código') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear permiso' });
    }
  }
};

/**
 * PUT /api/permisos/:id
 * Actualizar permiso existente
 */
export const editarPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { codigo, nombre, descripcion, modulo, accion, metodo, ruta } = req.body;

    // Validar que al menos un campo venga
    if (!codigo && !nombre && !descripcion && !modulo && !accion && metodo === undefined && ruta === undefined) {
      res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar' });
      return;
    }

    const dataToUpdate: any = {};

    if (codigo !== undefined) dataToUpdate.codigo = codigo.trim();
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion.trim();
    if (modulo !== undefined) dataToUpdate.modulo = modulo.trim();
    if (accion !== undefined) dataToUpdate.accion = accion.trim();
    if (metodo !== undefined) dataToUpdate.metodo = metodo?.trim() || null;
    if (ruta !== undefined) dataToUpdate.ruta = ruta?.trim() || null;

    const updated = await Permiso.update(id, dataToUpdate, getAuditoriaContext(req));

    if (!updated) {
      res.status(404).json({ error: 'Permiso no encontrado o sin cambios' });
      return;
    }

    const permisoActualizado = await Permiso.getById(id);

    res.status(200).json({
      mensaje: 'Permiso actualizado exitosamente',
      data: permisoActualizado
    });

    console.log(`✓ PERMISO: Actualizado permiso_id=${id} por usuario_id=${req.user!.id}`);
  } catch (error: any) {
    console.error('Error en editarPermiso:', error);

    if (error.message === 'Permiso no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Ya existe un permiso con ese código') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'No se puede cambiar el código de un permiso del sistema') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar permiso' });
    }
  }
};

/**
 * PATCH /api/permisos/:id/status
 * Cambiar estado del permiso (activar/inactivar)
 */
export const cambiarEstatusPermiso = async (req: Request, res: Response): Promise<void> => {
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

    const changed = await Permiso.changeStatus(id, activo, getAuditoriaContext(req));

    if (!changed) {
      res.status(404).json({ error: 'Permiso no encontrado' });
      return;
    }

    const permisoActualizado = await Permiso.getById(id);

    res.status(200).json({
      mensaje: `Permiso ${activo ? 'activado' : 'inactivado'} exitosamente`,
      data: permisoActualizado
    });

    console.log(`✓ PERMISO: Estado cambiado permiso_id=${id} a ${activo ? 'activo' : 'inactivo'}`);
  } catch (error: any) {
    console.error('Error en cambiarEstatusPermiso:', error);

    if (error.message.includes('ya está')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar estado del permiso' });
    }
  }
};

/**
 * DELETE /api/permisos/:id
 * Eliminar permiso físicamente (solo personalizados)
 */
export const eliminarPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Permiso.delete(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Permiso no encontrado' });
      return;
    }

    res.status(200).json({
      mensaje: 'Permiso eliminado exitosamente'
    });

    console.log(`✓ PERMISO: Eliminado permiso_id=${id} por usuario_id=${req.user!.id}`);
  } catch (error: any) {
    console.error('Error en eliminarPermiso:', error);

    if (error.message === 'Permiso no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar permiso' });
    }
  }
};

/**
 * GET /api/permisos/:id/historial
 * Obtener historial de auditoría del permiso
 */
export const obtenerHistorialPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    // Verificar que el permiso existe
    const permiso = await Permiso.getById(id);
    if (!permiso) {
      res.status(404).json({ error: 'Permiso no encontrado' });
      return;
    }

    const historial = await Permiso.getHistorial(id);

    res.status(200).json({
      permiso_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialPermiso:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};