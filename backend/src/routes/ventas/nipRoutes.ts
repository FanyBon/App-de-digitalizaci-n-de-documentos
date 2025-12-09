import { Router } from 'express';
import { validarNip, unlockNip } from '../../controller/ventas/nipController';
import {
  verifyToken,
  authorizeRolesOrProfiles,
  
} from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles permitidos (mismos usados en otras rutas de ventas)
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

// POST /api/ventas/validar-nip
// body: { empleado_id, nip, monedero_id?, intento_por? }
router.post(
  '/ventas/validar-nip',
  verifyToken,
  authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  validarNip
);

router.put(
  '/empleados/:id/unlock-nip',
  verifyToken,
  authorizeRolesOrProfiles(['supAdministrador','admin'], ['superAdministrador']),
  unlockNip
);


export default router;
