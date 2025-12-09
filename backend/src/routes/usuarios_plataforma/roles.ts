// src/routes/usuarios_plataforma/rolesRoutes.ts
import { Router } from 'express';
import {
  listarRoles,
  obtenerRol,
  crearRol,
  editarRol,
  cambiarEstatusRol,
  eliminarRol,
  obtenerHistorialRol
} from '../../controller/usuarios_plataforma/rolesController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/roles
 * Listar todos los roles
 * Query params: ?activo=true&es_sistema=false
 */
router.get(
  '/roles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarRoles
);

/**
 * GET /api/roles/:id
 * Obtener rol por ID con estadísticas
 */
router.get(
  '/roles/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerRol
);

/**
 * GET /api/roles/:id/historial
 * Obtener historial de auditoría de un rol
 */
router.get(
  '/roles/:id/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialRol
);

/**
 * POST /api/roles
 * Crear nuevo rol personalizado
 */
router.post(
  '/roles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  crearRol
);

/**
 * PUT /api/roles/:id
 * Actualizar rol
 */
router.put(
  '/roles/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  editarRol
);

/**
 * PATCH /api/roles/:id/status
 * Cambiar estado de rol (activar/inactivar)
 * Body: { "activo": true | false }
 */
router.patch(
  '/roles/:id/status',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  cambiarEstatusRol
);

/**
 * DELETE /api/roles/:id
 * Eliminar físicamente (solo roles personalizados sin usuarios)
 */
router.delete(
  '/roles/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarRol
);

export default router;