import { Router } from 'express';
import {
  listarMonederos,
  obtenerMonedero,
  crearMonedero,
  editarMonedero,
  eliminarMonedero,
  consultarSaldo,
  consultarSaldoQR      
} from '../../controller/recargas/monederosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];
const rolesCreaEdit = ['admin', 'supervisor'];
const perfilesCreaEdit = ['superAdministrador', 'administrador externo'];
const rolesDelete = ['admin'];
const perfilesDelete = ['superAdministrador'];

// GET /monederos        → Ver todos los monederos (roles básicos o perfiles básicos)
router.get('/monederos',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarMonederos
);

// GET /monederos/:id    → Ver un monedero por ID (roles básicos o perfiles básicos)
router.get('/monederos/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerMonedero
);

// NUEVAS RUTAS DE SALDO POR CÓDIGO
router.get(
  '/monederos/saldo/:codigo',
  consultarSaldo
);

// GET /monederos/saldo/qr/:qr → Saldo usando código QR
router.get(
  '/monederos/saldo/qr/:qr',
  consultarSaldoQR
);

// POST /monederos       → Crear monedero (solo admin o supervisor / perfiles asociados)
router.post(
  '/monederos',verifyToken,authorizeRolesOrProfiles(rolesCreaEdit, perfilesCreaEdit),
  crearMonedero
);

// PUT /monederos/:id    → Editar monedero (solo admin o supervisor / perfiles asociados)
router.put('/monederos/:id',verifyToken,authorizeRolesOrProfiles(rolesCreaEdit, perfilesCreaEdit),
  editarMonedero
);

// DELETE /monederos/:id → Eliminar monedero (solo admin / perfil superAdministrador)
router.delete('/monederos/:id',verifyToken,authorizeRolesOrProfiles(rolesDelete, perfilesDelete),
  eliminarMonedero
);

export default router;