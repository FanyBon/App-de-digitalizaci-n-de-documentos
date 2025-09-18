// src/models/Auth.ts
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getConnection } from '../config/db_controlcomidas'

export interface AuthPayload {
  id: number
  email: string
  nombre_usuario: string
  empresa_id: number
  empresa_nombre: string
  roles: string[]       // lista de roles del usuario
  perfiles: string[]    // lista de perfiles del usuario
}

export interface AuthResponse {
  token: string
  user_id: number
  nombre_usuario: string
  empresa_id: number
  empresa_nombre: string
  roles: string[]
  perfiles: string[]
}

export class Auth {
  /**
   * Busca el usuario, valida contraseña,
   * obtiene roles y perfiles, genera un JWT
   * y devuelve datos para el front.
   */
  static async login(
    emailOrUsername: string,
    password: string
  ): Promise<AuthResponse> {
    const conn = await getConnection()             // conectar a la BD

    // 1) Traer usuario + contraseña + empresa
    const [rows]: [any[], any] = await conn.query(
      `
      SELECT
        u.id,
        u.email,
        u.nombre_usuario,
        u.password,
        u.empresa_id,
        e.nombre AS empresa_nombre
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.email = ? OR u.nombre_usuario = ?
      `,
      [emailOrUsername, emailOrUsername]
    )
    const user = rows[0]
    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    // 2) Verificar contraseña
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new Error('Credenciales inválidas')
    }

    // 3) Traer roles del usuario
    const [roleRows]: [any[], any] = await conn.query(
      `
      SELECT r.nombre
      FROM roles r
      JOIN usuario_roles ur ON r.id = ur.rol_id
      WHERE ur.usuario_id = ?
      `,
      [user.id]
    )
    const roles: string[] = roleRows.map(r => r.nombre)

    // 4) Traer perfiles del usuario
    const [perfilRows]: [any[], any] = await conn.query(
      `
      SELECT p.nombre
      FROM perfiles p
      JOIN usuario_perfiles up ON p.id = up.perfil_id
      WHERE up.usuario_id = ?
      `,
      [user.id]
    )
    const perfiles: string[] = perfilRows.map(p => p.nombre)

    // 5) Construir payload con roles y perfiles
    const payload: AuthPayload = {
      id:              user.id,
      email:           user.email,
      nombre_usuario:  user.nombre_usuario,
      empresa_id:      user.empresa_id,
      empresa_nombre:  user.empresa_nombre,
      roles,           // inyectar roles
      perfiles         // inyectar perfiles
    }

    // 6) Firmar JWT
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    )

    // 7) Devolver al front token + datos + roles + perfiles
    return {
      token,
      user_id:        user.id,
      nombre_usuario: user.nombre_usuario,
      empresa_id:     user.empresa_id,
      empresa_nombre: user.empresa_nombre,
      roles,
      perfiles
    }
  }
}
