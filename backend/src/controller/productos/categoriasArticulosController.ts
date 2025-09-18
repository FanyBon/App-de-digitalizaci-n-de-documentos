// src/controller/categoriasArticulosController.ts
import { Request, Response, NextFunction } from 'express';
import { CategoriaArticulo } from '../../models/productos/CategoriasArticulos';

// Listar todas las categorías
export const listarCategorias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categorias = await CategoriaArticulo.listar();
    res.status(200).json(categorias);
  } catch (error) {
    console.error('Error en listarCategorias:', error);
    next(error);
  }
};

// Obtener categoría por ID
export const obtenerCategoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const categoria = await CategoriaArticulo.obtenerPorId(Number(id));
    if (!categoria) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    res.status(200).json(categoria);
  } catch (error) {
    console.error('Error en obtenerCategoria:', error);
    next(error);
  }
};

// Crear categoría con validación de nombre único
export const crearCategoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, descripcion, tipo, empresa_id } = req.body;
    // Validación básica
    if (!nombre || !descripcion || !tipo || !empresa_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios: nombre, descripcion, tipo, empresa_id' });
      return;
    }
    const result = await CategoriaArticulo.crear({ nombre, descripcion, tipo, empresa_id });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearCategoria:', error);
    next(error);
  }
};

// Editar categoría con validación de nombre único
export const editarCategoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!id) {
      res.status(400).json({ error: 'El ID de la categoría es obligatorio' });
      return;
    }
    const result = await CategoriaArticulo.editar(Number(id), data);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(200).json(result.data);
  } catch (error) {
    console.error('Error en editarCategoria:', error);
    next(error);
  }
};

// Eliminar categoría
export const eliminarCategoria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await CategoriaArticulo.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error en eliminarCategoria:', error);
    next(error);
  }
};
