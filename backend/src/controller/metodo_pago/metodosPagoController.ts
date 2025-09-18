// src/controller/metodosPagoController.ts
import { Request, Response, NextFunction } from 'express';
import { MetodoPago } from '../../models/metodo_pago/MetodosPago';

export const listarMetodosPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metodos = await MetodoPago.listar();
    res.status(200).json(metodos);
  } catch (error) {
    console.error('Error en listarMetodosPago:', error);
    next(error);
  }
};

export const obtenerMetodoPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const metodo = await MetodoPago.obtenerPorId(Number(id));
    if (!metodo) {
      res.status(404).json({ error: 'Método de pago no encontrado' });
      return;
    }
    res.status(200).json(metodo);
  } catch (error) {
    console.error('Error en obtenerMetodoPago:', error);
    next(error);
  }
};

export const crearMetodoPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, codigo, comision, requiere_validacion, activo, empresa_id } = req.body;

    // Validación básica
    if (!nombre || !codigo || comision === undefined || requiere_validacion === undefined || activo === undefined || !empresa_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios: nombre, codigo, comision, requiere_validacion, activo, empresa_id' });
      return;
    }

    const result = await MetodoPago.crear({ nombre, codigo, comision, requiere_validacion, activo, empresa_id });
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearMetodoPago:', error);
    next(error);
  }
};

export const editarMetodoPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    const result = await MetodoPago.editar(Number(id), data);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Método de pago actualizado correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarMetodoPago:', error);
    next(error);
  }
};

export const eliminarMetodoPago = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }
    const result = await MetodoPago.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Método de pago eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarMetodoPago:', error);
    next(error);
  }
};
