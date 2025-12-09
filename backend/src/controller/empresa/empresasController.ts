// src/controller/empresa/empresasController.ts
import { Request, Response } from 'express';
import { Empresa } from '../../models/empresa/Empresa';

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
 * GET /api/empresas
 * Listar todas las empresas
 */
export const listarEmpresas = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.estatus) {
      filters.estatus = req.query.estatus as 'activo' | 'inactivo' | 'suspendido';
    }

    if (req.query.parent_id) {
      filters.parent_id = req.query.parent_id === 'null' ? null : Number(req.query.parent_id);
    }

    const empresas = await Empresa.getAll(filters);

    res.status(200).json({
      total: empresas.length,
      data: empresas
    });
  } catch (error: any) {
    console.error('Error en listarEmpresas:', error);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
};

/**
 * GET /api/empresas/:id
 * Obtener empresa por ID con estadísticas
 */
export const obtenerEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const empresa = await Empresa.getById(id);

    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const stats = await Empresa.getStats(id);

    res.status(200).json({
      ...empresa,
      stats
    });
  } catch (error: any) {
    console.error('Error en obtenerEmpresa:', error);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
};

/**
 * POST /api/empresas
 * Crear nueva empresa
 */
export const crearEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      contacto,
      telefono,
      parent_id,
      costo_charola,
      estimado_personas,
      estatus
    } = req.body;

    // Validaciones
    if (!nombre || !contacto || !telefono) {
      res.status(400).json({ 
        error: 'Campos obligatorios: nombre, contacto, telefono' 
      });
      return;
    }

    const empresaId = await Empresa.create(
      {
        nombre,
        contacto,
        telefono,
        parent_id,
        costo_charola,
        estimado_personas,
        estatus
      },
      getAuditoriaContext(req)
    );

    const empresaCreada = await Empresa.getById(empresaId);

    res.status(201).json({
      mensaje: 'Empresa creada exitosamente',
      data: empresaCreada
    });

    console.log(`✅ EMPRESA: Creada empresa_id=${empresaId} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en crearEmpresa:', error);

    if (error.message === 'Ya existe una empresa con ese nombre') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Empresa padre no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear empresa' });
    }
  }
};

/**
 * PUT /api/empresas/:id
 * Actualizar empresa
 */
export const editarEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const {
      nombre,
      contacto,
      telefono,
      parent_id,
      costo_charola,
      estimado_personas,
      estatus
    } = req.body;

    const updated = await Empresa.update(
      id,
      {
        nombre,
        contacto,
        telefono,
        parent_id,
        costo_charola,
        estimado_personas,
        estatus
      },
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Empresa no encontrada o sin cambios' });
      return;
    }

    const empresaActualizada = await Empresa.getById(id);

    res.status(200).json({
      mensaje: 'Empresa actualizada exitosamente',
      data: empresaActualizada
    });

    console.log(`✅ EMPRESA: Actualizada empresa_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en editarEmpresa:', error);

    if (error.message === 'Empresa no encontrada') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Ya existe una empresa con ese nombre') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Una empresa no puede ser su propia empresa padre') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Empresa padre no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar empresa' });
    }
  }
};

/**
 * PATCH /api/empresas/:id/status
 * Cambiar estatus (soft delete)
 */
export const cambiarEstatusEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { estatus } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (!['activo', 'inactivo', 'suspendido'].includes(estatus)) {
      res.status(400).json({ 
        error: 'Estatus inválido. Debe ser: activo, inactivo o suspendido' 
      });
      return;
    }

    const changed = await Empresa.changeStatus(id, estatus, getAuditoriaContext(req));

    if (!changed) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const empresaActualizada = await Empresa.getById(id);

    res.status(200).json({
      mensaje: `Empresa ${estatus === 'activo' ? 'activada' : estatus === 'inactivo' ? 'inactivada' : 'suspendida'} exitosamente`,
      data: empresaActualizada
    });

    console.log(`✅ EMPRESA: Estatus cambiado empresa_id=${id} a ${estatus}`);

  } catch (error: any) {
    console.error('Error en cambiarEstatusEmpresa:', error);

    if (error.message.includes('ya tiene estatus')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede cambiar estatus')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar estatus' });
    }
  }
};

/**
 * DELETE /api/empresas/:id
 * Eliminar físicamente (solo SuperAdmin)
 */
export const eliminarEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Empresa.delete(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    res.status(200).json({
      mensaje: 'Empresa eliminada exitosamente'
    });

    console.log(`✅ EMPRESA: Eliminada empresa_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en eliminarEmpresa:', error);

    if (error.message === 'Empresa no encontrada') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar empresa' });
    }
  }
};

/**
 * GET /api/empresas/:id/historial
 * Obtener historial de auditoría
 */
export const obtenerHistorialEmpresa = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const historial = await Empresa.getHistorial(id);

    res.status(200).json({
      empresa_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialEmpresa:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};