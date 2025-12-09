import { Router } from 'express';
import { previewVenta } from '../../controller/ventas/previewController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

router.post(
  '/ventas/preview',
  verifyToken,
  authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  previewVenta
);

export default router;
