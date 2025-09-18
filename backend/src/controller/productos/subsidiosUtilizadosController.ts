import { Request, Response, NextFunction } from 'express';
import { SubsidioUtilizado } from '../../models/productos/SubsidiosUtilizados';

// Listar subsidios utilizados
export const listarSubsidiosUtilizados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subsidiosUtilizados = await SubsidioUtilizado.listar();
    res.status(200).json(subsidiosUtilizados);
  } catch (error) {
    console.error('Error en listarSubsidiosUtilizados:', error);
    next(error);
  }
};

// Obtener subsidio utilizado por ID
export const obtenerSubsidioUtilizado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const subsidioUtilizado = await SubsidioUtilizado.obtenerPorId(Number(id));
    if (!subsidioUtilizado) {
      res.status(404).json({ error: 'Subsidio utilizado no encontrado' });
      return;
    }
    res.status(200).json(subsidioUtilizado);
  } catch (error) {
    console.error('Error en obtenerSubsidioUtilizado:', error);
    next(error);
  }
};

// Crear subsidio utilizado
export const crearSubsidioUtilizado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SubsidioUtilizado.crear(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearSubsidioUtilizado:', error);
    next(error);
  }
};

// Editar subsidio utilizado
export const editarSubsidioUtilizado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SubsidioUtilizado.editar(Number(req.params.id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error en editarSubsidioUtilizado:', error);
    next(error);
  }
};

// Eliminar subsidio utilizado
export const eliminarSubsidioUtilizado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SubsidioUtilizado.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarSubsidioUtilizado:', error);
    next(error);
  }
};
