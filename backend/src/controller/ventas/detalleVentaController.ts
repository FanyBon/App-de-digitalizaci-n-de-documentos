import { Request, Response, NextFunction } from 'express';
import { DetalleVenta } from '../../models/ventas/DetalleVenta';

// Listar detalles de venta
export const listarDetallesVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const detallesVenta = await DetalleVenta.listar();
    res.status(200).json(detallesVenta);
  } catch (error) {
    console.error('Error en listarDetallesVenta:', error);
    next(error);
  }
};

// Obtener detalle de venta por ID
export const obtenerDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const detalleVenta = await DetalleVenta.obtenerPorId(Number(id));
    if (!detalleVenta) {
      res.status(404).json({ error: 'Detalle de venta no encontrado' });
      return;
    }
    res.status(200).json(detalleVenta);
  } catch (error) {
    console.error('Error en obtenerDetalleVenta:', error);
    next(error);
  }
};

// Crear detalle de venta
export const crearDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await DetalleVenta.crear(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearDetalleVenta:', error);
    next(error);
  }
};

// Editar detalle de venta
export const editarDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await DetalleVenta.editar(Number(req.params.id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error en editarDetalleVenta:', error);
    next(error);
  }
};

// Eliminar detalle de venta
export const eliminarDetalleVenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await DetalleVenta.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarDetalleVenta:', error);
    next(error);
  }
};
