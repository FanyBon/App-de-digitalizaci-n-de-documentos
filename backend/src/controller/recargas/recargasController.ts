import { Request, Response, NextFunction } from 'express';
import { Recarga } from '../../models/recargas/Recarga';

export const listarRecargas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recargas = await Recarga.listar();
    res.status(200).json(recargas);
  } catch (error) {
    console.error('Error en listarRecargas:', error);
    next(error);
  }
};

export const obtenerRecarga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const recarga = await Recarga.obtenerPorId(Number(id));
    if (!recarga) {
      res.status(404).json({ error: 'Recarga no encontrada' });
      return;
    }
    res.status(200).json(recarga);
  } catch (error) {
    console.error('Error en obtenerRecarga:', error);
    next(error);
  }
};

export const crearRecarga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { monedero_id, monto, metodo_pago_id, usuario_id } = req.body;
    
    // Validación básica
    if (!monedero_id || monto === undefined || !metodo_pago_id || !usuario_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios: monedero_id, monto, metodo_pago_id, usuario_id' });
      return;
    }

    // Puedes agregar validaciones adicionales, por ejemplo, que metodo_pago sea 'efectivo' o 'tarjeta'

    const result = await Recarga.crear({ monedero_id, monto, metodo_pago_id, usuario_id });
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearRecarga:', error);
    next(error);
  }
};

export const editarRecarga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    const result = await Recarga.editar(Number(id), data);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Recarga actualizada correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarRecarga:', error);
    next(error);
  }
};

export const eliminarRecarga = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }
    const result = await Recarga.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Recarga eliminada correctamente' });
  } catch (error) {
    console.error('Error en eliminarRecarga:', error);
    next(error);
  }
};
