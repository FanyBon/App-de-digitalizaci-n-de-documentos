import { Router } from 'express';
import {
  listarUsuarios,
  crearUsuario,
  editarUsuarioConRoles ,
  editarUsuarioParcial,
  eliminarUsuario
} from '../../controller/usuarios_plataforma/usuariosController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

router.get(
  '/usuarios',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador', 'admin externo', 'admin', 'supervisor'],
    ['superAdministrador']
  ),
  listarUsuarios
);

router.post(
  '/usuarios',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador', 'admin externo', 'admin', 'supervisor'],
    ['superAdministrador']
  ),
  crearUsuario
);

router.put(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(['supAdministrador'], ['superAdministrador']),
  editarUsuarioConRoles
)

router.patch(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador', 'admin externo', 'admin'],
    ['superAdministrador']
  ),
  editarUsuarioParcial
);

router.delete(
  '/usuarios/:id',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
  ),
  eliminarUsuario
);

export default router;
