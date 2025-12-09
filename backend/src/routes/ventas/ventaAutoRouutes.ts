import { Router } from 'express';
import { listAutoChargeProducts, autoCharge } from '../../controller/ventas/ventaAutomaticaController';
import { verifyToken, authorizeRolesOrProfiles } from '../../middewares/authMiddleware';

const router = Router();

const rolesPermitidos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesPermitidos = ['superAdministrador', 'administrador externo'];

router.get('/products/auto-charge',
  verifyToken,
  authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
  listAutoChargeProducts
);

router.post('/sales/auto-charge',
  verifyToken,
  authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
  autoCharge
);

export default router;
