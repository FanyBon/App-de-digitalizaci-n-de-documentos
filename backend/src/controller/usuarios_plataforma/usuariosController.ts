// src/controllers/usuariosController.ts

import { Request, Response, NextFunction } from 'express'
import validator from 'validator'
import { Usuario } from '../../models/usuarios_plataforma/Usuario'
import { UsuarioRol } from '../../models/usuarios_plataforma/UsuarioRol'
import { UsuarioPerfil } from '../../models/usuarios_plataforma/UsuarioPerfil'

export const authorizeRole = (allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'No tienes permiso para ver usuarios' })
      return
    }
    next()
  }

export const listarUsuarios = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role, empresa_id } = (req as any).user
    const usuarios = role === 'supAdministrador'
      ? await Usuario.listar()
      : await Usuario.listarPorEmpresa(empresa_id)
    res.status(200).json(usuarios)
  } catch (err) {
    console.error('Error en listarUsuarios:', err)
    next(err)
  }
}

export const crearUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      email,
      nombre_usuario,
      password,
      empresa_id,
      rolId,      // opcional
      perfilId    // opcional
    } = req.body

    // validaciones básicas
    if (!email || !nombre_usuario || !password || !empresa_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios' })
      return
    }
    if (!validator.isEmail(email)) {
      res.status(400).json({ error: 'Email inválido' })
      return
    }
    if (!validator.isAlphanumeric(nombre_usuario)) {
      res.status(400).json({ error: 'Usuario inválido' })
      return
    }

    // 1) crear usuario en 'usuarios'
    const resultUsuario = await Usuario.crear(
      email,
      nombre_usuario,
      password,
      empresa_id
    )
    if (!resultUsuario.success) {
      res.status(500).json({ error: resultUsuario.error })
      return
    }

    // extraer el nuevo ID
    const nuevo = resultUsuario.data as any
    const userId = nuevo.id ?? nuevo.insertId

    // 2) asignar rol si viene
    if (rolId !== undefined) {
      const validRoleIds = [1, 2, 3, 4, 5, 6] 
      if (!validRoleIds.includes(rolId)) {
        res.status(400).json({ error: 'Rol no válido' })
        return
      }
      const resultRol = await UsuarioRol.asignarRol(userId, rolId)
      if (!resultRol.success) {
        res.status(500).json({ error: resultRol.error })
        return
      }
    }

    // 3) asignar perfil si viene
    if (perfilId !== undefined) {
      const validPerfilIds = [1, 2, 3, 4]   // ajusta según tu tabla 'perfiles'
      if (!validPerfilIds.includes(perfilId)) {
        res.status(400).json({ error: 'Perfil no válido' })
        return
      }
      await UsuarioPerfil.asignarPerfil(userId, perfilId)
    }

    // 4) opcionalmente, devolver lista de roles y perfiles asignados
    const rolesAsignados    = rolId    ? await UsuarioRol.listarRoles(userId)    : []
    const perfilesAsignados = perfilId ? await UsuarioPerfil.listarPorUsuario(userId) : []

    res.status(201).json({
      id: userId,
      email,
      nombre_usuario,
      empresa_id,
      roles: rolesAsignados,
      perfiles: perfilesAsignados
    })
  } catch (err) {
    console.error('Error en crearUsuario:', err)
    next(err)
  }
}

export const editarUsuarioConRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const {
      email,
      nombre_usuario,
      password,
      empresa_id,

      // roles
      roles,
      rolId,

      // perfiles
      perfiles,
      perfilId
    } = req.body

    // 1) Validar ID
    if (!validator.isNumeric(String(id))) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    // 2) Normalizar roles a array de números
    let rolesToSync: number[] | undefined
    if (Array.isArray(roles)) {
      rolesToSync = roles.map(r => Number(r))
    } else if (rolId !== undefined) {
      rolesToSync = [Number(rolId)]
    }

    // 3) Normalizar perfiles a array de números
    let perfilesToSync: number[] | undefined
    if (Array.isArray(perfiles)) {
      perfilesToSync = perfiles.map(p => Number(p))
    } else if (perfilId !== undefined) {
      perfilesToSync = [Number(perfilId)]
    }

    // 4) Ejecutar edición de usuario + roles (dentro de transacción si tu modelo lo hace)
    const result = await Usuario.editarConRoles(id, {
      email,
      nombre_usuario,
      password,
      empresa_id,
      roles: rolesToSync
    })

    if (!result.success) {
      res.status(404).json({ error: result.error })
      return
    }

    // 5) Sincronizar tabla usuario_perfiles si vienen perfiles a controlar
    if (perfilesToSync) {
      // Obtener perfiles actuales
      const actuales = await UsuarioPerfil.listarPorUsuario(id)
      const actualesIds = actuales.map((u: any) => u.perfil_id)

      // Determinar qué agregar y qué quitar
      const aAgregar = perfilesToSync.filter(p => !actualesIds.includes(p))
      const aQuitar  = actualesIds.filter(p => !perfilesToSync!.includes(p))

      // Agregar perfiles nuevos
      for (const pid of aAgregar) {
        await UsuarioPerfil.asignarPerfil(id, pid)
      }
      // Quitar perfiles que ya no deben existir
      for (const pid of aQuitar) {
        await UsuarioPerfil.quitarPerfil(id, pid)
      }
    }

    // 6) Volver a cargar roles y perfiles para la respuesta
    const rolesActualizados    = rolesToSync    ? await UsuarioRol.listarRoles(id)    : []
    const perfilesActualizados = perfilesToSync ? await UsuarioPerfil.listarPorUsuario(id) : []

    res.status(200).json({
      message: 'Usuario, roles y perfiles actualizados',
      data: result.data,
      roles: rolesActualizados,
      perfiles: perfilesActualizados
    })
  } catch (err) {
    console.error('Error en editarUsuarioConRoles:', err)
    next(err)
  }
}

export const editarUsuarioParcial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    if (!validator.isNumeric(id)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const { email, nombre_usuario, rol, empresa_id, password } = req.body
    const updateData: any = {}

    if (email !== undefined) {
      if (!validator.isEmail(email)) {
        res.status(400).json({ error: 'Email inválido' })
        return
      }
      updateData.email = email
    }
    if (nombre_usuario !== undefined) {
      if (!validator.isAlphanumeric(nombre_usuario)) {
        res.status(400).json({ error: 'Usuario inválido' })
        return
      }
      updateData.nombre_usuario = nombre_usuario
    }
    if (rol !== undefined) {
      const rolesValid = [
        'supAdministrador',
        'admin externo',
        'admin',
        'supervisor',
        'usuario',
        'comensal'
      ]
      if (!rolesValid.includes(rol)) {
        res.status(400).json({ error: 'Rol no válido' })
        return
      }
      updateData.rol = rol
    }
    if (empresa_id !== undefined) {
      if (!validator.isNumeric(String(empresa_id))) {
        res.status(400).json({ error: 'Empresa inválida' })
        return
      }
      updateData.empresa_id = empresa_id
    }
    if (password !== undefined && password.trim()) {
      updateData.password = password
    }

    if (!Object.keys(updateData).length) {
      res.status(400).json({ error: 'Nada que actualizar' })
      return
    }

    const result = await Usuario.editarConRoles(Number(id), updateData)
    if (!result.success) {
      res.status(404).json({ error: result.error })
      return
    }

    res
      .status(200)
      .json({ message: 'Usuario actualizado', data: result.data })
  } catch (err) {
    console.error('Error en editarUsuarioParcial:', err)
    next(err)
  }
}

export const eliminarUsuario = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    if (!validator.isNumeric(id)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const result = await Usuario.eliminar(Number(id))
    if (!result.success) {
      res.status(404).json({ error: result.error })
      return
    }

    res.status(200).json({ message: 'Usuario eliminado' })
  } catch (err) {
    console.error('Error en eliminarUsuario:', err)
    next(err)
  }
}
