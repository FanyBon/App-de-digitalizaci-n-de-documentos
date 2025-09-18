import { Router } from 'express';
import {
  procesarPagoNormal,
  listarVentasNormales
} from '../../controller/ventas/pagosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles que solo pueden procesar pagos
const rolesProcesar = ['admin', 'supervisor'];
const perfilesProcesar = ['superAdministrador', 'administrador externo'];

// Roles y perfiles que pueden ver el listado
const rolesVer = [
  'supAdministrador',
  'admin externo',
  'admin',
  'supervisor',
  'usuario'
];
const perfilesVer = ['superAdministrador', 'administrador externo'];

router.route('/pagos')

  // GET /pagos → cualquiera de los roles o perfiles básicos puede ver
  .get(verifyToken,authorizeRolesOrProfiles(rolesVer, perfilesVer),
    listarVentasNormales
  )

  // POST /pagos → solo admin o supervisor (y perfiles equivalentes) pueden procesar
  .post(verifyToken,authorizeRolesOrProfiles(rolesProcesar, perfilesProcesar),
    procesarPagoNormal
  );

export default router;