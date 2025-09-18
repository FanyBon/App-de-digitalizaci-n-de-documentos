import { Request, Response, NextFunction } from 'express';
import { VentaPDV } from '../../models/ventas/VentasPDV';

// Listar ventas
export const listarVentasPDV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ventas = await VentaPDV.listar();
    res.status(200).json(ventas);
  } catch (error) {
    console.error('Error en listarVentasPDV:', error);
    next(error);
  }
};

// Obtener venta por ID
export const obtenerVentaPDV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const venta = await VentaPDV.obtenerPorId(Number(id));
    if (!venta) {
      res.status(404).json({ error: 'Venta no encontrada' });
      return;
    }
    res.status(200).json(venta);
  } catch (error) {
    console.error('Error en obtenerVentaPDV:', error);
    next(error);
  }
};

// Crear venta
export const crearVentaPDV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await VentaPDV.crear(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearVentaPDV:', error);
    next(error);
  }
};

// Editar venta
export const editarVentaPDV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await VentaPDV.editar(Number(req.params.id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error en editarVentaPDV:', error);
    next(error);
  }
};

// Eliminar venta
export const eliminarVentaPDV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await VentaPDV.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarVentaPDV:', error);
    next(error);
  }
};
