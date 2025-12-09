// src/routes/usuarios_plataforma/usuarioRolesRoutes.ts
import { Router } from 'express';
import {
  verRolesUsuario,
  verHistorialRolesUsuario,
  asignarRolUsuario,
  editarRolesUsuario,
  quitarRolUsuario,
  eliminarRolUsuario
} from '../../controller/usuarios_plataforma/usuarioRolesController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles
const rolesLectura = ['supAdministrador', 'admin externo', 'admin'];
const perfilesLectura = ['superAdministrador', 'administrador externo'];
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/usuarios/:id/roles
 * Listar roles activos de un usuario
 */
router.get(
  '/usuarios/:id/roles',
  verifyToken,
  authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  verRolesUsuario
);

/**
 * GET /api/usuarios/:id/roles/historial
 * Ver historial completo de roles (incluyendo removidos)
 */
router.get(
  '/usuarios/:id/roles/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  verHistorialRolesUsuario
);

/**
 * POST /api/usuarios/:id/roles
 * Asignar un rol a un usuario
 * Body: { "rolId": 2 }
 */
router.post(
  '/usuarios/:id/roles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  asignarRolUsuario
);

/**
 * PUT /api/usuarios/:id/roles
 * Reemplazar todos los roles de un usuario
 * Body: { "roles": [1, 2, 3] }
 */
router.put(
  '/usuarios/:id/roles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  editarRolesUsuario
);

/**
 * DELETE /api/usuarios/:id/roles/:rolId
 * Quitar un rol de un usuario (soft delete)
 */
router.delete(
  '/usuarios/:id/roles/:rolId',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  quitarRolUsuario
);

/**
 * DELETE /api/usuarios/:id/roles/:rolId/permanente
 * Eliminar físicamente un rol de un usuario (hard delete)
 */
router.delete(
  '/usuarios/:id/roles/:rolId/permanente',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarRolUsuario
);

export default router;