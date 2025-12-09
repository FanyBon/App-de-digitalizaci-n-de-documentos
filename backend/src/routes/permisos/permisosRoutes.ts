// src/routes/permisos/permisosRoutes.ts
import { Router } from 'express';
import {
  listarPermisos,
  listarModulos,
  obtenerPermiso,
  crearPermiso,
  editarPermiso,
  cambiarEstatusPermiso,
  eliminarPermiso,
  obtenerHistorialPermiso
} from '../../controller/permisos/permisosController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Permisos de acceso
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/permisos
 * Listar todos los permisos con filtros opcionales
 * Query params: ?modulo=usuarios&activo=true&es_sistema=false
 */
router.get(
  '/permisos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarPermisos
);

/**
 * GET /api/permisos/modulos
 * Obtener lista de módulos únicos
 */
router.get(
  '/permisos/modulos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarModulos
);

/**
 * GET /api/permisos/:id
 * Obtener permiso específico por ID
 */
router.get(
  '/permisos/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerPermiso
);

/**
 * GET /api/permisos/:id/historial
 * Obtener historial de auditoría de un permiso
 */
router.get(
  '/permisos/:id/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialPermiso
);

/**
 * POST /api/permisos
 * Crear nuevo permiso personalizado
 * Body: { "codigo": "string", "nombre": "string", "modulo": "string", "accion": "string", ... }
 */
router.post(
  '/permisos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  crearPermiso
);

/**
 * PUT /api/permisos/:id
 * Actualizar permiso existente
 * Body: { "codigo": "string", "nombre": "string", ... }
 */
router.put(
  '/permisos/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  editarPermiso
);

/**
 * PATCH /api/permisos/:id/status
 * Cambiar estado del permiso (activar/inactivar)
 * Body: { "activo": true | false }
 */
router.patch(
  '/permisos/:id/status',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  cambiarEstatusPermiso
);

/**
 * DELETE /api/permisos/:id
 * Eliminar permiso físicamente (solo personalizados)
 */
router.delete(
  '/permisos/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarPermiso
);

export default router;