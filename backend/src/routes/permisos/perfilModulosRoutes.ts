// src/routes/permisos/perfilModulosRoutes.ts
import { Router } from 'express';
import {
  listarModulosDePerfil,
  listarPerfilesConModulo,
  asignarModulo,
  removerModulo,
  sincronizarModulos,
  obtenerHistorialPerfil
} from '../../controller/permisos/perfilModulosController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Permisos de acceso
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/perfiles/:perfil_id/modulos
 * Listar módulos activos asignados a un perfil específico
 */
router.get(
  '/perfiles/:perfil_id/modulos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarModulosDePerfil
);

/**
 * GET /api/modulos-frontend/:modulo_id/perfiles
 * Listar perfiles activos que tienen un módulo específico
 */
router.get(
  '/modulos-frontend/:modulo_id/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarPerfilesConModulo
);

/**
 * GET /api/perfiles/:perfil_id/modulos/historial
 * Obtener historial de auditoría de asignaciones de un perfil
 */
router.get(
  '/perfiles/:perfil_id/modulos/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialPerfil
);

/**
 * POST /api/perfiles/:perfil_id/modulos
 * Asignar módulo a perfil (o reactivar si existe inactivo)
 * Body: { "modulo_id": 3 }
 */
router.post(
  '/perfiles/:perfil_id/modulos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  asignarModulo
);

/**
 * PUT /api/perfiles/:perfil_id/modulos/sync
 * Sincronizar módulos de un perfil (reemplazar todos)
 * Body: { "modulo_ids": [1, 2, 3, 5, 8] }
 */
router.put(
  '/perfiles/:perfil_id/modulos/sync',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  sincronizarModulos
);

/**
 * DELETE /api/perfiles/:perfil_id/modulos/:modulo_id
 * Remover módulo de perfil (soft delete - lo marca como inactivo)
 */
router.delete(
  '/perfiles/:perfil_id/modulos/:modulo_id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  removerModulo
);

export default router;