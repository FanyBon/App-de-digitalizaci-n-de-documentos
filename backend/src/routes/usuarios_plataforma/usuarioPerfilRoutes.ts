// src/routes/usuarios_plataforma/usuarioPerfilRoutes.ts
import { Router } from 'express';
import {
  listarPerfilesDeUsuario,
  listarUsuariosConPerfil,
  listarTodasAsignaciones,
  asignarPerfil,
  removerPerfil,
  eliminarAsignacion,
  sincronizarPerfiles,
  obtenerHistorialUsuario,
  obtenerHistorialPerfil
} from '../../controller/usuarios_plataforma/UsuarioPerfilController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles permitidos
const rolesLectura = ['supAdministrador', 'admin externo', 'admin'];
const perfilesLectura = ['superAdministrador', 'administrador externo'];
const rolesSuperAdmin = ['supAdministrador'];
const perfilesSuperAdmin = ['superAdministrador'];

/**
 * GET /api/usuarios/:usuario_id/perfiles
 * Listar perfiles activos asignados a un usuario específico
 */
router.get(
  '/usuarios/:usuario_id/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  listarPerfilesDeUsuario
);

/**
 * GET /api/perfiles/:perfil_id/usuarios
 * Listar usuarios activos que tienen un perfil específico
 */
router.get(
  '/perfiles/:perfil_id/usuarios',
  verifyToken,
  authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  listarUsuariosConPerfil
);

/**
 * GET /api/usuario-perfiles
 * Listar todas las asignaciones con filtros opcionales
 * Query params: ?usuario_id=1&perfil_id=2&activo=true
 */
router.get(
  '/usuario-perfiles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  listarTodasAsignaciones
);

/**
 * GET /api/usuarios/:usuario_id/perfiles/historial
 * Obtener historial de auditoría de asignaciones de un usuario
 */
router.get(
  '/usuarios/:usuario_id/perfiles/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialUsuario
);

/**
 * GET /api/perfiles/:perfil_id/historial
 * Obtener historial de auditoría de asignaciones de un perfil
 */
router.get(
  '/perfiles/:perfil_id/historial',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  obtenerHistorialPerfil
);

/**
 * POST /api/usuarios/:usuario_id/perfiles
 * Asignar perfil a usuario (o reactivar si existe inactivo)
 * Body: { "perfil_id": 2 }
 */
router.post(
  '/usuarios/:usuario_id/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  asignarPerfil
);

/**
 * PUT /api/usuarios/:usuario_id/perfiles/sync
 * Sincronizar perfiles de un usuario (reemplazar todos)
 * Body: { "perfil_ids": [1, 2, 3] }
 */
router.put(
  '/usuarios/:usuario_id/perfiles/sync',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  sincronizarPerfiles
);

/**
 * DELETE /api/usuarios/:usuario_id/perfiles/:perfil_id
 * Remover perfil de usuario (soft delete - lo marca como inactivo)
 */
router.delete(
  '/usuarios/:usuario_id/perfiles/:perfil_id',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  removerPerfil
);

/**
 * DELETE /api/usuarios/:usuario_id/perfiles/:perfil_id/permanente
 * Eliminar asignación físicamente (hard delete - uso solo en casos extremos)
 */
router.delete(
  '/usuarios/:usuario_id/perfiles/:perfil_id/permanente',
  verifyToken,
  authorizeRolesOrProfiles(rolesSuperAdmin, perfilesSuperAdmin),
  eliminarAsignacion
);

export default router;