import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ImpuestoModel, ImpuestoInterface } from '../../models/ventas/ImpuestoModel';

const handleValidation = (req: Request, res: Response) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ errors: errs.array() });
    return true;
  }
  return false;
};

export const listarImpuestos = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const impuestos = await ImpuestoModel.listar();
    res.status(200).json(impuestos);
  } catch (err) {
    next(err);
  }
};

export const obtenerImpuesto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (handleValidation(req, res)) return;
  try {
    const id = Number(req.params.id);
    const impuesto = await ImpuestoModel.obtenerPorId(id);
    if (!impuesto) {
      res.status(404).json({ error: 'Impuesto no encontrado' });
      return;
    }
    res.status(200).json(impuesto);
  } catch (err) {
    next(err);
  }
};

export const crearImpuesto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (handleValidation(req, res)) return;
  try {
    const data = req.body as ImpuestoInterface;
    const result = await ImpuestoModel.crear(data);
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const actualizarImpuesto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (handleValidation(req, res)) return;
  try {
    const id = Number(req.params.id);
    const data = req.body as Partial<ImpuestoInterface>;
    const result = await ImpuestoModel.actualizar(id, data);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const eliminarImpuesto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (handleValidation(req, res)) return;
  try {
    const id = Number(req.params.id);
    const result = await ImpuestoModel.eliminar(id);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Impuesto eliminado' });
  } catch (err) {
    next(err);
  }
};
