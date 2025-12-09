// src/routes/usuarios_plataforma/usuariosRoutes.ts
import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  editarUsuarioConRoles,
  editarUsuarioParcial,
  cambiarEstatusUsuario,
  eliminarUsuario,
  obtenerHistorialUsuario
} from '../../controller/usuarios_plataforma/usuariosController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles
const rolesLectura = ['supAdministrador', 'admin externo', 'admin', 'supervisor'];
const perfilesLectura = ['superAdministrador', 'administrador externo'];
const rolesEscritura = ['supAdministrador', 'admin externo', 'admin'];
const perfilesEscritura = ['superAdministrador', 'administrador externo'];
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/usuarios
 * Listar todos los usuarios con filtros
 * Query params: ?empresa_id=1&ubicacion_id=2&activo=true&rol_id=1&perfil_id=1
 */
router.get(
  '/usuarios',
  verifyToken,
  authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  listarUsuarios
);

/**
 * GET /api/usuarios/:id
 * Obtener usuario por ID con estadísticas
 */
router.get(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  obtenerUsuario
);

/**
 * GET /api/usuarios/:id/historial
 * Obtener historial de auditoría de un usuario
 */
router.get(
  '/usuarios/:id/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesEscritura, perfilesEscritura),
  obtenerHistorialUsuario
);

/**
 * POST /api/usuarios
 * Crear nuevo usuario
 * Body: { email, nombre_usuario, password, empresa_id, ubicacion_id?, roles: [], perfiles: [] }
 */
router.post(
  '/usuarios',
  verifyToken,
  authorizeRolesOrProfiles(rolesEscritura, perfilesEscritura),
  crearUsuario
);

/**
 * PUT /api/usuarios/:id
 * Actualizar usuario completo (incluye roles y perfiles)
 */
router.put(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  editarUsuarioConRoles
);

/**
 * PATCH /api/usuarios/:id
 * Actualizar usuario parcial (sin roles ni perfiles)
 */
router.patch(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesEscritura, perfilesEscritura),
  editarUsuarioParcial
);

/**
 * PATCH /api/usuarios/:id/status
 * Cambiar estado de usuario (activar/inactivar)
 * Body: { "activo": true | false }
 */
router.patch(
  '/usuarios/:id/status',
  verifyToken,
  authorizeRolesOrProfiles(rolesEscritura, perfilesEscritura),
  cambiarEstatusUsuario
);

/**
 * DELETE /api/usuarios/:id
 * Eliminar físicamente (solo SuperAdmin)
 */
router.delete(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarUsuario
);

export default router;