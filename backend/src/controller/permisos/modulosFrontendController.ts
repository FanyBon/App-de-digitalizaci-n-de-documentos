// src/controller/permisos/modulosFrontendController.ts
import { Request, Response } from 'express';
import { ModuloFrontend } from '../../models/permisos/ModuloFrontend';

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
 * GET /api/modulos-frontend
 * Listar todos los módulos con filtros opcionales
 * Query params: ?activo=true&es_sistema=false&padre_id=null
 */
export const listarModulos = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    if (req.query.es_sistema !== undefined) {
      filters.es_sistema = req.query.es_sistema === 'true';
    }

    if (req.query.padre_id !== undefined) {
      filters.padre_id = req.query.padre_id === 'null' ? null : Number(req.query.padre_id);
    }

    const modulos = await ModuloFrontend.getAll(filters);

    res.status(200).json({
      total: modulos.length,
      filtros_aplicados: filters,
      data: modulos
    });
  } catch (error: any) {
    console.error('Error en listarModulos:', error);
    res.status(500).json({ error: 'Error al listar módulos' });
  }
};

/**
 * GET /api/modulos-frontend/principales
 * Obtener solo módulos principales (sin padre)
 */
export const listarModulosPrincipales = async (req: Request, res: Response): Promise<void> => {
  try {
    const modulos = await ModuloFrontend.getPrincipales();

    res.status(200).json({
      total: modulos.length,
      data: modulos
    });
  } catch (error: any) {
    console.error('Error en listarModulosPrincipales:', error);
    res.status(500).json({ error: 'Error al listar módulos principales' });
  }
};

/**
 * GET /api/modulos-frontend/:id/hijos
 * Obtener submódulos de un módulo padre
 */
export const listarSubmodulos = async (req: Request, res: Response): Promise<void> => {
  try {
    const padreId = Number(req.params.id);

    if (isNaN(padreId)) {
      res.status(400).json({ error: 'ID de padre inválido' });
      return;
    }

    const submodulos = await ModuloFrontend.getHijos(padreId);

    res.status(200).json({
      padre_id: padreId,
      total: submodulos.length,
      data: submodulos
    });
  } catch (error: any) {
    console.error('Error en listarSubmodulos:', error);
    res.status(500).json({ error: 'Error al listar submódulos' });
  }
};

/**
 * GET /api/modulos-frontend/:id
 * Obtener módulo por ID
 */
export const obtenerModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const modulo = await ModuloFrontend.getById(id);

    if (!modulo) {
      res.status(404).json({ error: 'Módulo no encontrado' });
      return;
    }

    res.status(200).json(modulo);
  } catch (error: any) {
    console.error('Error en obtenerModulo:', error);
    res.status(500).json({ error: 'Error al obtener módulo' });
  }
};

/**
 * POST /api/modulos-frontend
 * Crear nuevo módulo
 */
export const crearModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, nombre, descripcion, icono, ruta, padre_id, orden } = req.body;

    // Validaciones
    if (!codigo || typeof codigo !== 'string' || codigo.trim().length === 0) {
      res.status(400).json({ error: 'El código del módulo es obligatorio' });
      return;
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      res.status(400).json({ error: 'El nombre del módulo es obligatorio' });
      return;
    }

    const moduloId = await ModuloFrontend.create(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        icono: icono?.trim() || null,
        ruta: ruta?.trim() || null,
        padre_id: padre_id ? Number(padre_id) : null,
        orden: orden ? Number(orden) : 0,
        es_sistema: false,
        activo: true
      },
      getAuditoriaContext(req)
    );

    const moduloCreado = await ModuloFrontend.getById(moduloId);

    res.status(201).json({
      mensaje: 'Módulo creado exitosamente',
      data: moduloCreado
    });

    console.log(`✓ MODULO-FRONTEND: Creado modulo_id=${moduloId} por usuario_id=${req.user!.id}`);
  } catch (error: any) {
    console.error('Error en crearModulo:', error);

    if (error.message === 'Ya existe un módulo con ese código') {
      res.status(409).json({ error: error.message });
    } else if (error.message.includes('padre')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear módulo' });
    }
  }
};

/**
 * PUT /api/modulos-frontend/:id
 * Actualizar módulo existente
 */
export const editarModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { codigo, nombre, descripcion, icono, ruta, padre_id, orden } = req.body;

    // Validar que al menos un campo venga
    if (!codigo && !nombre && !descripcion && !icono && !ruta && padre_id === undefined && orden === undefined) {
      res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar' });
      return;
    }

    const dataToUpdate: any = {};

    if (codigo !== undefined) dataToUpdate.codigo = codigo.trim();
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion.trim();
    if (icono !== undefined) dataToUpdate.icono = icono?.trim() || null;
    if (ruta !== undefined) dataToUpdate.ruta = ruta?.trim() || null;
    if (padre_id !== undefined) dataToUpdate.padre_id = padre_id ? Number(padre_id) : null;
    if (orden !== undefined) dataToUpdate.orden = Number(orden);

    const updated = await ModuloFrontend.update(id, dataToUpdate, getAuditoriaContext(req));

    if (!updated) {
      res.status(404).json({ error: 'Módulo no encontrado o sin cambios' });
      return;
    }

    const moduloActualizado = await ModuloFrontend.getById(id);

    res.status(200).json({
      mensaje: 'Módulo actualizado exitosamente',
      data: moduloActualizado
    });

    console.log(`✓ MODULO-FRONTEND: Actualizado modulo_id=${id} por usuario_id=${req.user!.id}`);
  } catch (error: any) {
    console.error('Error en editarModulo:', error);

    if (error.message === 'Módulo no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Ya existe un módulo con ese código') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'No se puede cambiar el código de un módulo del sistema') {
      res.status(403).json({ error: error.message });
    } else if (error.message.includes('padre')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar módulo' });
    }
  }
};

/**
 * PATCH /api/modulos-frontend/:id/status
 * Cambiar estado del módulo (activar/inactivar)
 */
export const cambiarEstatusModulo = async (req: Request, res: Response): Promise<void> => {
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

    const changed = await ModuloFrontend.changeStatus(id, activo, getAuditoriaContext(req));

    if (!changed) {
      res.status(404).json({ error: 'Módulo no encontrado' });
      return;
    }

    const moduloActualizado = await ModuloFrontend.getById(id);

    res.status(200).json({
      mensaje: `Módulo ${activo ? 'activado' : 'inactivado'} exitosamente`,
      data: moduloActualizado
    });

    console.log(`✓ MODULO-FRONTEND: Estado cambiado modulo_id=${id} a ${activo ? 'activo' : 'inactivo'}`);
  } catch (error: any) {
    console.error('Error en cambiarEstatusModulo:', error);

    if (error.message.includes('ya está')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede desactivar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar estado del módulo' });
    }
  }
};

/**
 * DELETE /api/modulos-frontend/:id
 * Eliminar módulo físicamente (solo personalizados sin hijos)
 */
export const eliminarModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await ModuloFrontend.delete(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Módulo no encontrado' });
      return;
    }

    res.status(200).json({
      mensaje: 'Módulo eliminado exitosamente'
    });

    console.log(`✓ MODULO-FRONTEND: Eliminado modulo_id=${id} por usuario_id=${req.user!.id}`);
  } catch (error: any) {
    console.error('Error en eliminarModulo:', error);

    if (error.message === 'Módulo no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar módulo' });
    }
  }
};

/**
 * GET /api/modulos-frontend/:id/historial
 * Obtener historial de auditoría del módulo
 */
export const obtenerHistorialModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    // Verificar que el módulo existe
    const modulo = await ModuloFrontend.getById(id);
    if (!modulo) {
      res.status(404).json({ error: 'Módulo no encontrado' });
      return;
    }

    const historial = await ModuloFrontend.getHistorial(id);

    res.status(200).json({
      modulo_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialModulo:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};