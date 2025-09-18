import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import createError from 'http-errors'

// AuthPayload define los datos que guardamos en el JWT
export interface AuthPayload {
  id: number
  email: string
  nombre_usuario: string
  empresa_id: number
  empresa_nombre: string
  roles: string[]
  perfiles: string[]
  iat: number
  exp: number
}

// Extendemos el Request de Express para incluir user?: AuthPayload
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

// verifyToken extrae y valida el Bearer token, inyecta req.user
export const verifyToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // 1) Comprobar encabezado
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer '))
    throw new createError.Unauthorized('Formato inválido. Se requiere Bearer.')

  // 2) Extraer token
  const token = authHeader.split(' ')[1]?.trim()
  if (!token) throw new createError.Unauthorized('Token no proporcionado')

  try {
    // 3) Verificar y decodificar
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    req.user = decoded       // ← inyectamos el payload en la petición
    next()
  } catch (err) {
    next(new createError.Unauthorized('Token inválido o expirado'))
  }
}

// authorizeRoles valida que el usuario tenga al menos uno de los roles permitidos
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles || []
    const hasAccess = userRoles.some(r => allowedRoles.includes(r))

    if (!hasAccess)
      throw new createError.Forbidden('No tienes permisos por rol')
    next()
  }
}

// authorizeProfiles valida que el usuario tenga al menos uno de los perfiles permitidos
export const authorizeProfiles = (allowedProfiles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userProfiles = req.user?.perfiles || []
    const hasAccess    = userProfiles.some(p => allowedProfiles.includes(p))

    if (!hasAccess)
      throw new createError.Forbidden('No tienes permisos por perfil')
    next()
  }
}

// authorizeRolesOrProfiles: OR lógico entre roles y perfiles
export const authorizeRolesOrProfiles = (
  allowedRoles: string[],
  allowedProfiles: string[]
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRoles    = req.user?.roles    || []
    const userProfiles = req.user?.perfiles || []

    // 1) Verificar alguno de los roles
    const roleOk    = userRoles.some(r => allowedRoles.includes(r))
    // 2) Verificar alguno de los perfiles
    const profileOk = userProfiles.some(p => allowedProfiles.includes(p))

    // 3) Si ninguno coincide, denegar
    if (!roleOk && !profileOk)
      throw new createError.Forbidden('No tienes permisos por rol o perfil')

    next()
  }
}