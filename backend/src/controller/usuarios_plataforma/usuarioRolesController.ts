// src/controller/usuarios_plataforma/usuarioRolesController.ts

import { Request, Response, NextFunction } from 'express'
import { UsuarioRol } from '../../models/usuarios_plataforma/UsuarioRol'

// Listar roles de un usuario
export const verRolesUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id)
    const roles = await UsuarioRol.listarRoles(usuarioId)
    res.json(roles)
  } catch (err) {
    next(err)
  }
}

// Asignar un rol a un usuario
export const asignarRolUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id)
    const { rolId } = req.body

    if (!rolId) {
      res.status(400).json({ error: 'rolId requerido' })
      return
    }

    await UsuarioRol.asignarRol(usuarioId, rolId)
    res.sendStatus(204)
  } catch (err) {
    next(err)
  }
}

export const editarRolesUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id)
    const nuevosRoles: number[] = req.body.roles

    if (!Array.isArray(nuevosRoles)) {
      res.status(400).json({ error: 'Se requiere un array de roles' })
      return
    }

    // 1) Listar roles actuales
    const actuales = await UsuarioRol.listarRoles(usuarioId)
    const actualesIds = actuales.map(r => r.id)

    // 2) Calcular borrados y adicionados
    const aEliminar = actualesIds.filter(id => !nuevosRoles.includes(id))
    const aAgregar  = nuevosRoles.filter(id => !actualesIds.includes(id))

    // 3) Ejecutar cambios
    await Promise.all(
      aEliminar.map(rolId => UsuarioRol.quitarRol(usuarioId, rolId))
    )
    await Promise.all(
      aAgregar.map(rolId => UsuarioRol.asignarRol(usuarioId, rolId))
    )

    // 4) Devolver la lista actualizada
    const listaActual = await UsuarioRol.listarRoles(usuarioId)
    res.status(200).json(listaActual)
  } catch (err) {
    next(err)
  }
}

// Quitar un rol de un usuario
export const quitarRolUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id)
    const rolId = Number(req.params.rolId)

    await UsuarioRol.quitarRol(usuarioId, rolId)
    res.sendStatus(204)
  } catch (err) {
    next(err)
  }
}
