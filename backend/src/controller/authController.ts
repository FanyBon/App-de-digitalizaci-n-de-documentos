// src/controllers/authController.ts
import { Request, Response } from 'express'
import validator from 'validator'
import { Auth, AuthResponse } from '../models/Auth'

/**
 * POST /api/login
 * Body: { emailOrUsername, password }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { emailOrUsername, password } = req.body

  // validar campos obligatorios
  if (!emailOrUsername || !password) {
    console.warn('Faltan campos obligatorios en el login.')
    res
      .status(400)
      .json({ error: 'Email/Usuario y contraseña son obligatorios' })
    return
  }

  // validar formato (email o alfanumérico)
  const isValidInput =
    validator.isEmail(emailOrUsername) ||
    validator.isAlphanumeric(emailOrUsername)
  if (!isValidInput) {
    console.warn('Entrada inválida para email o nombre de usuario.')
    res
      .status(400)
      .json({ error: 'El email o nombre de usuario no es válido' })
    return
  }

  try {
    // intentar login
    const result: AuthResponse = await Auth.login(
      emailOrUsername,
      password
    )
    console.log(`Intento de login exitoso para: ${emailOrUsername}`)
    res.status(200).json(result)  // incluye token, datos, roles y perfiles

  } catch (error: any) {
    console.error(
      `Intento de login fallido para: ${emailOrUsername}`,
      error
    )

    // mapear errores a códigos HTTP adecuados
    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message })
    } else if (error.message === 'Credenciales inválidas') {
      res.status(401).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  }
}
