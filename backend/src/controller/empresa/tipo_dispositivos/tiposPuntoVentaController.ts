// src/controllers/empresa/tiposPuntoVentaController.ts
import { Request, Response } from 'express';
import { TipoPuntoVenta } from '../../../models/empresa/tipo_dispositivos/TipoPuntoVenta';

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
 * GET /api/tipos-punto-venta
 * Listar tipos de punto de venta
 */
export const getTiposPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const soloActivos = req.query.activo !== 'false';
    const tipos = await TipoPuntoVenta.getAll(soloActivos);

    res.status(200).json({
      total: tipos.length,
      data: tipos
    });
  } catch (error: any) {
    console.error('Error en getTiposPuntoVenta:', error);
    res.status(500).json({ error: 'Error al obtener tipos de punto de venta' });
  }
};

/**
 * GET /api/tipos-punto-venta/:id
 * Obtener tipo por ID
 */
export const getTipoPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const tipo = await TipoPuntoVenta.getById(id);

    if (!tipo) {
      res.status(404).json({ error: 'Tipo de punto de venta no encontrado' });
      return;
    }

    const stats = await TipoPuntoVenta.getStats(id);

    res.status(200).json({
      ...tipo,
      stats
    });
  } catch (error: any) {
    console.error('Error en getTipoPuntoVenta:', error);
    res.status(500).json({ error: 'Error al obtener tipo de punto de venta' });
  }
};

/**
 * GET /api/tipos-punto-venta/codigo/:codigo
 * Obtener tipo por código
 */
export const getTipoPuntoVentaByCodigo = async (req: Request, res: Response): Promise<void> => {
  try {
    const codigo = req.params.codigo;
    const tipo = await TipoPuntoVenta.getByCodigo(codigo);

    if (!tipo) {
      res.status(404).json({ error: 'Tipo de punto de venta no encontrado' });
      return;
    }

    res.status(200).json(tipo);
  } catch (error: any) {
    console.error('Error en getTipoPuntoVentaByCodigo:', error);
    res.status(500).json({ error: 'Error al obtener tipo de punto de venta' });
  }
};

/**
 * POST /api/tipos-punto-venta
 * Crear nuevo tipo
 */
export const createTipoPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, nombre, descripcion, icono, color, orden, categoria, requiere_caja, permite_ventas } = req.body;

    if (!codigo || !nombre) {
      res.status(400).json({
        error: 'Campos obligatorios: codigo, nombre'
      });
      return;
    }

    const tipoId = await TipoPuntoVenta.create(
      {
        codigo,
        nombre,
        descripcion,
        icono,
        color,
        orden,
        categoria,
        requiere_caja,
        permite_ventas,
        creado_por: req.user!.id
      },
      getAuditoriaContext(req)
    );

    const nuevoTipo = await TipoPuntoVenta.getById(tipoId);

    res.status(201).json({
      mensaje: 'Tipo de punto de venta creado exitosamente',
      data: nuevoTipo
    });
  } catch (error: any) {
    console.error('Error en createTipoPuntoVenta:', error);

    if (error.message === 'El código de tipo ya existe') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear tipo de punto de venta' });
    }
  }
};

/**
 * PUT /api/tipos-punto-venta/:id
 * Actualizar tipo
 */
export const updateTipoPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { nombre, descripcion, icono, color, orden, categoria, requiere_caja, permite_ventas } = req.body;

    const updated = await TipoPuntoVenta.update(
      id,
      { nombre, descripcion, icono, color, orden, categoria, requiere_caja, permite_ventas },
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Tipo de punto de venta no encontrado o sin cambios' });
      return;
    }

    const tipoActualizado = await TipoPuntoVenta.getById(id);

    res.status(200).json({
      mensaje: 'Tipo de punto de venta actualizado exitosamente',
      data: tipoActualizado
    });
  } catch (error: any) {
    console.error('Error en updateTipoPuntoVenta:', error);

    if (error.message === 'Tipo de punto de venta no encontrado') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar tipo de punto de venta' });
    }
  }
};

/**
 * DELETE /api/tipos-punto-venta/:id
 * Desactivar tipo
 */
export const deleteTipoPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await TipoPuntoVenta.deactivate(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Tipo de punto de venta no encontrado' });
      return;
    }

    res.status(200).json({
      mensaje: 'Tipo de punto de venta desactivado exitosamente'
    });
  } catch (error: any) {
    console.error('Error en deleteTipoPuntoVenta:', error);

    if (error.message === 'El tipo ya está inactivo') {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede desactivar')) {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Tipo de punto de venta no encontrado') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al desactivar tipo de punto de venta' });
    }
  }
};

/**
 * PATCH /api/tipos-punto-venta/:id/reactivate
 * Reactivar tipo
 */
export const reactivateTipoPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const reactivated = await TipoPuntoVenta.reactivate(id, getAuditoriaContext(req));

    if (!reactivated) {
      res.status(404).json({ error: 'Tipo de punto de venta no encontrado' });
      return;
    }

    const tipo = await TipoPuntoVenta.getById(id);

    res.status(200).json({
      mensaje: 'Tipo de punto de venta reactivado exitosamente',
      data: tipo
    });
  } catch (error: any) {
    console.error('Error en reactivateTipoPuntoVenta:', error);

    if (error.message === 'El tipo ya está activo') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Tipo de punto de venta no encontrado') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al reactivar tipo de punto de venta' });
    }
  }
};

/**
 * GET /api/tipos-punto-venta/:id/historial
 * Ver historial de auditoría
 */
export const getHistorialTipoPuntoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const historial = await TipoPuntoVenta.getHistorial(id);

    res.status(200).json({
      tipo_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en getHistorialTipoPuntoVenta:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};