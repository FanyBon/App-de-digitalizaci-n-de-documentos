// src/routes/permisos/rolPermisosRoutes.ts
import { Router } from 'express';
import {
  listarPermisosDeRol,
  listarRolesConPermiso,
  asignarPermiso,
  removerPermiso,
  sincronizarPermisos,
  obtenerHistorialRol
} from '../../controller/permisos/rolPermisosController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Permisos de acceso
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/roles/:rol_id/permisos
 * Listar permisos activos asignados a un rol específico
 */
router.get(
  '/roles/:rol_id/permisos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarPermisosDeRol
);

/**
 * GET /api/permisos/:permiso_id/roles
 * Listar roles activos que tienen un permiso específico
 */
router.get(
  '/permisos/:permiso_id/roles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarRolesConPermiso
);

/**
 * GET /api/roles/:rol_id/permisos/historial
 * Obtener historial de auditoría de asignaciones de un rol
 */
router.get(
  '/roles/:rol_id/permisos/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialRol
);

/**
 * POST /api/roles/:rol_id/permisos
 * Asignar permiso a rol (o reactivar si existe inactivo)
 * Body: { "permiso_id": 5 }
 */
router.post(
  '/roles/:rol_id/permisos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  asignarPermiso
);

/**
 * PUT /api/roles/:rol_id/permisos/sync
 * Sincronizar permisos de un rol (reemplazar todos)
 * Body: { "permiso_ids": [1, 2, 3, 5, 8] }
 */
router.put(
  '/roles/:rol_id/permisos/sync',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  sincronizarPermisos
);

/**
 * DELETE /api/roles/:rol_id/permisos/:permiso_id
 * Remover permiso de rol (soft delete - lo marca como inactivo)
 */
router.delete(
  '/roles/:rol_id/permisos/:permiso_id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  removerPermiso
);

export default router;