import { Request, Response, NextFunction } from 'express';
import { Subsidio } from '../../models/productos/Subsidios';

// Listar subsidios
export const listarSubsidios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subsidios = await Subsidio.listar();
    res.status(200).json(subsidios);
  } catch (error) {
    console.error('Error en listarSubsidios:', error);
    next(error);
  }
};

// Obtener subsidio por ID
export const obtenerSubsidio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const subsidio = await Subsidio.obtenerPorId(Number(id));
    if (!subsidio) {
      res.status(404).json({ error: 'Subsidio no encontrado' });
      return;
    }
    res.status(200).json(subsidio);
  } catch (error) {
    console.error('Error en obtenerSubsidio:', error);
    next(error);
  }
};

// Crear subsidio con validación de nombre único
export const crearSubsidio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Subsidio.crear(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearSubsidio:', error);
    next(error);
  }
};

// Editar subsidio
export const editarSubsidio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Subsidio.editar(Number(req.params.id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error en editarSubsidio:', error);
    next(error);
  }
};

// Eliminar subsidio
export const eliminarSubsidio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Subsidio.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarSubsidio:', error);
    next(error);
  }
};
