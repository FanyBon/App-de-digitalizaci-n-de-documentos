// src/routes/usuarios_plataforma/usuarioPerfilRoutes.ts
import { Router } from 'express';
import UsuarioPerfilController from '../../controller/usuarios_plataforma/UsuarioPerfilController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

// Listar todas las asignaciones
router.get(
  '/',
  verifyToken,
  authorizeRolesOrProfiles(['supAdministrador', 'admin externo'], ['superAdministrador']),
  UsuarioPerfilController.listarTodos
);

// Listar perfiles de un usuario
router.get(
  '/usuarios/:usuario_id/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(['supAdministrador', 'admin externo'], ['superAdministrador']),
  UsuarioPerfilController.listarPorUsuario
);

// Asignar perfil a un usuario
router.post(
  '/usuarios/:usuario_id/perfiles',
  verifyToken,
  authorizeRolesOrProfiles(['supAdministrador'], ['superAdministrador']),
  UsuarioPerfilController.asignarPerfil
);

// Quitar un perfil de un usuario
router.delete(
  '/usuarios/:usuario_id/perfiles/:perfil_id',
  verifyToken,
  authorizeRolesOrProfiles(['supAdministrador'], ['superAdministrador']),
  UsuarioPerfilController.quitarPerfil
);

export default router;
