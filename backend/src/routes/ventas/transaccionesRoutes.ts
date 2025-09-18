import { Router } from 'express';
import {
  listarTransacciones,
  obtenerTransaccion,
  buscarTransacciones,
  editarTransaccion,
  procesarTransaccion,
  eliminarTransaccion
} from '../../controller/ventas/transaccionesController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles generales para consulta y creación
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

// Todos los roles básicos o perfiles básicos pueden listar
router.get('/transacciones',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarTransacciones
);

// Todos los roles básicos o perfiles básicos pueden ver detalle
router.get('/transacciones/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerTransaccion
);

// Todos los roles básicos o perfiles básicos pueden buscar
router.get('/transacciones/search',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  buscarTransacciones
);

// Todos los roles básicos o perfiles básicos pueden procesar
router.post('/transacciones',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  procesarTransaccion
);

// Solo supAdministrador o perfil superAdministrador pueden editar
router.put('/transacciones/:id',verifyToken,authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
  ),
  editarTransaccion
);

// Solo supAdministrador o perfil superAdministrador pueden eliminar
router.delete('/transacciones/:id',verifyToken,authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
  ),
  eliminarTransaccion
);

export default router;