// src/routes/usuarios_plataforma/usuarioRolesRoutes.ts

import { Router } from 'express'
import {
  verRolesUsuario,
  asignarRolUsuario,
  quitarRolUsuario,
  editarRolesUsuario,
} from '../../controller/usuarios_plataforma/usuarioRolesController'
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware'

const router = Router()

// Listar los roles de un usuario
router.get(
  '/usuarios/:id/roles',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador', 'admin externo'],
    ['superAdministrador']
  ),
  verRolesUsuario
)

// Asignar un rol a un usuario
router.post(
  '/usuarios/:id/roles',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
  ),
  asignarRolUsuario
)

router.put(
  '/usuarios/:id/roles',
  authorizeRolesOrProfiles(['supAdministrador'], ['superAdministrador']),
  editarRolesUsuario
)

// Quitar un rol de un usuario
router.delete(
  '/usuarios/:id/roles/:rolId',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
  ),
  quitarRolUsuario
)

export default router
