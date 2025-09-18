import { Request, Response, NextFunction } from 'express';
import { Perfil } from '../../models/usuarios_plataforma/Perfil';

// GET /api/perfiles
export const listarPerfiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const perfiles = await Perfil.listar();
    res.status(200).json(perfiles);
  } catch (err) {
    next(err);
  }
};

// GET /api/perfiles/:id
export const obtenerPerfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const perfil = await Perfil.obtenerPorId(id);
    if (!perfil) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.status(200).json(perfil);
  } catch (err) {
    next(err);
  }
};

// POST /api/perfiles
export const crearPerfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || typeof nombre !== 'string' || !descripcion || typeof descripcion !== 'string') {
      res.status(400).json({ error: 'Nombre y descripción son obligatorios' });
      return;
    }
    const nuevo = await Perfil.crear(nombre.trim(), descripcion.trim());
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
};

// PUT /api/perfiles/:id
export const editarPerfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { nombre, descripcion } = req.body;
    if (!nombre || typeof nombre !== 'string' || !descripcion || typeof descripcion !== 'string') {
      res.status(400).json({ error: 'Nombre y descripción son obligatorios' });
      return;
    }
    const ok = await Perfil.editar(id, nombre.trim(), descripcion.trim());
    if (!ok) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.status(200).json({ message: 'Perfil actualizado' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/perfiles/:id
export const eliminarPerfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const ok = await Perfil.eliminar(id);
    if (!ok) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.status(200).json({ message: 'Perfil eliminado' });
  } catch (err) {
    next(err);
  }
};
