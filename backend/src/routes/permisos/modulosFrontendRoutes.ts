// src/routes/permisos/modulosFrontendRoutes.ts
import { Router } from 'express';
import {
  listarModulos,
  listarModulosPrincipales,
  listarSubmodulos,
  obtenerModulo,
  crearModulo,
  editarModulo,
  cambiarEstatusModulo,
  eliminarModulo,
  obtenerHistorialModulo
} from '../../controller/permisos/modulosFrontendController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Permisos de acceso
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/modulos-frontend
 * Listar todos los módulos con filtros opcionales
 * Query params: ?activo=true&es_sistema=false&padre_id=null
 */
router.get(
  '/modulos-frontend',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarModulos
);

/**
 * GET /api/modulos-frontend/principales
 * Obtener solo módulos principales (sin padre)
 */
router.get(
  '/modulos-frontend/principales',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarModulosPrincipales
);

/**
 * GET /api/modulos-frontend/:id
 * Obtener módulo específico por ID
 */
router.get(
  '/modulos-frontend/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerModulo
);

/**
 * GET /api/modulos-frontend/:id/hijos
 * Obtener submódulos de un módulo padre
 */
router.get(
  '/modulos-frontend/:id/hijos',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarSubmodulos
);

/**
 * GET /api/modulos-frontend/:id/historial
 * Obtener historial de auditoría de un módulo
 */
router.get(
  '/modulos-frontend/:id/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialModulo
);

/**
 * POST /api/modulos-frontend
 * Crear nuevo módulo personalizado
 * Body: { "codigo": "string", "nombre": "string", "ruta": "string", ... }
 */
router.post(
  '/modulos-frontend',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  crearModulo
);

/**
 * PUT /api/modulos-frontend/:id
 * Actualizar módulo existente
 * Body: { "codigo": "string", "nombre": "string", ... }
 */
router.put(
  '/modulos-frontend/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  editarModulo
);

/**
 * PATCH /api/modulos-frontend/:id/status
 * Cambiar estado del módulo (activar/inactivar)
 * Body: { "activo": true | false }
 */
router.patch(
  '/modulos-frontend/:id/status',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  cambiarEstatusModulo
);

/**
 * DELETE /api/modulos-frontend/:id
 * Eliminar módulo físicamente (solo personalizados sin hijos)
 */
router.delete(
  '/modulos-frontend/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarModulo
);

export default router;