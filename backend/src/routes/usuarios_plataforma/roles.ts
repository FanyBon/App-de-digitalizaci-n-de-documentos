import { Router } from 'express';
import {
  listarRoles,
  obtenerRol,
  crearRol,
  editarRol,
  eliminarRol
} from '../../controller/usuarios_plataforma/rolesController';
import { verifyToken, authorizeRoles } from '../../middewares/authMiddleware';

const router = Router();

// Solo supAdministrador puede gestionar roles
type Role = 'supAdministrador';
const adminOnly: Role[] = ['supAdministrador'];

router.get('/roles',verifyToken,authorizeRoles(adminOnly),
  listarRoles
);

router.get('/roles/:id',verifyToken,authorizeRoles(adminOnly),
  obtenerRol
);

router.post('/roles',verifyToken,authorizeRoles(adminOnly),
  crearRol
);

router.put('/roles/:id',verifyToken,authorizeRoles(adminOnly),
  editarRol
);

router.delete('/roles/:id',verifyToken,authorizeRoles(adminOnly),
  eliminarRol
);

export default router;