import { Request, Response, NextFunction } from 'express'
import { Rol } from '../../models/usuarios_plataforma/Rol'

// GET /api/roles
export const listarRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roles = await Rol.listar()
    res.status(200).json(roles)
  } catch (err) {
    next(err)
  }
}

//GET /api/roles/:id
export const obtenerRol = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const rol = await Rol.obtenerPorId(id)
    if (!rol) {
      res.status(404).json({ error: 'Rol no encontrado' })
      return
    }
    res.status(200).json(rol)
  } catch (err) {
    next(err)
  }
}

//POST /api/roles
export const crearRol = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nombre } = req.body
    if (!nombre || typeof nombre !== 'string') {
      res.status(400).json({ error: 'Nombre de rol es obligatorio' })
      return
    }
    const nuevo = await Rol.crear(nombre.trim())
    res.status(201).json(nuevo)
  } catch (err) {
    next(err)
  }
}

// PUT /api/roles/:id
export const editarRol = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { nombre } = req.body
    if (!nombre || typeof nombre !== 'string') {
      res.status(400).json({ error: 'Nombre de rol es obligatorio' })
      return
    }
    const ok = await Rol.editar(id, nombre.trim())
    if (!ok) {
      res.status(404).json({ error: 'Rol no encontrado' })
      return
    }
    res.status(200).json({ message: 'Rol actualizado' })
  } catch (err) {
    next(err)
  }
}

//DELETE /api/roles/:id
export const eliminarRol = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const ok = await Rol.eliminar(id)
    if (!ok) {
      res.status(404).json({ error: 'Rol no encontrado' })
      return
    }
    res.status(200).json({ message: 'Rol eliminado' })
  } catch (err) {
    next(err)
  }
}
