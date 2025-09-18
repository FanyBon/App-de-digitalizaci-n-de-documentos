import { Request, Response, NextFunction } from 'express';
import { FamiliaProducto } from '../../models/productos/FamiliasProductos';

// Listar todas las familias de productos
export const listarFamiliasProductos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const familias = await FamiliaProducto.listar();
    res.status(200).json(familias);
  } catch (error) {
    console.error('Error en listarFamiliasProductos:', error);
    next(error);
  }
};

// Obtener una familia de productos por ID
export const obtenerFamiliaProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const familia = await FamiliaProducto.obtenerPorId(Number(id));
    if (!familia) {
      res.status(404).json({ error: 'Familia de productos no encontrada' });
      return;
    }
    res.status(200).json(familia);
  } catch (error) {
    console.error('Error en obtenerFamiliaProducto:', error);
    next(error);
  }
};

// Crear una nueva familia de productos
export const crearFamiliaProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, descripcion, parent_id, empresa_id } = req.body;

    // Validación básica
    if (!nombre || !descripcion || !empresa_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const result = await FamiliaProducto.crear({ nombre, descripcion, parent_id, empresa_id });
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearFamiliaProducto:', error);
    next(error);
  }
};

// Editar una familia de productos
export const editarFamiliaProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    const result = await FamiliaProducto.editar(Number(id), data);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Familia de productos actualizada correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarFamiliaProducto:', error);
    next(error);
  }
};

// Eliminar una familia de productos
export const eliminarFamiliaProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    const result = await FamiliaProducto.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Familia de productos eliminada correctamente' });
  } catch (error) {
    console.error('Error en eliminarFamiliaProducto:', error);
    next(error);
  }
};
