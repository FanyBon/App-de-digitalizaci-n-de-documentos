// src/routes/usuarios_plataforma/perfilesRoutes.ts
import { Router } from 'express';
import {
  listarPerfiles,
  obtenerPerfil,
  crearPerfil,
  editarPerfil,
  cambiarEstatusPerfil,
  eliminarPerfil,
  obtenerHistorialPerfil
} from '../../controller/usuarios_plataforma/perfilesController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles permitidos
const rolesLectura = ['supAdministrador', 'admin externo', 'admin'];
const perfilesLectura = ['superAdministrador', 'administrador externo'];
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/perfiles
 * Listar todos los perfiles con filtros opcionales
 * Query params: ?activo=true&es_sistema=false
 */
router.get(
  '/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  listarPerfiles
);

/**
 * GET /api/perfiles/:id
 * Obtener perfil específico con estadísticas
 */
router.get(
  '/perfiles/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerPerfil
);

/**
 * GET /api/perfiles/:id/historial
 * Obtener historial de auditoría del perfil
 */
router.get(
  '/perfiles/:id/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialPerfil
);

/**
 * POST /api/perfiles
 * Crear nuevo perfil personalizado
 * Body: { "nombre": "string", "descripcion": "string" }
 */
router.post(
  '/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  crearPerfil
);

/**
 * PUT /api/perfiles/:id
 * Actualizar perfil existente
 * Body: { "nombre": "string", "descripcion": "string" }
 */
router.put(
  '/perfiles/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  editarPerfil
);

/**
 * PATCH /api/perfiles/:id/status
 * Cambiar estado del perfil (activar/inactivar)
 * Body: { "activo": true | false }
 */
router.patch(
  '/perfiles/:id/status',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  cambiarEstatusPerfil
);

/**
 * DELETE /api/perfiles/:id
 * Eliminar perfil físicamente (solo personalizados sin usuarios)
 */
router.delete(
  '/perfiles/:id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarPerfil
);

export default router;