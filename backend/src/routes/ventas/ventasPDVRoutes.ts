import { Router } from 'express';
import {
  listarVentasPDV,
  obtenerVentaPDV,
  crearVentaPDV,
  editarVentaPDV,
  eliminarVentaPDV
} from '../../controller/ventas/ventasPDVController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles permitidos para operaciones básicas
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

// Ver todas las ventas — roles o perfiles básicos
router.get('/ventas_pdv', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarVentasPDV
);

// Ver venta por ID — roles o perfiles básicos
router.get('/ventas_pdv/:id', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerVentaPDV
);

// Crear venta — roles o perfiles básicos
router.post('/ventas_pdv', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  crearVentaPDV
);

// Editar venta — solo supAdministrador o perfil superAdministrador
router.put('/ventas_pdv/:id', verifyToken, authorizeRolesOrProfiles(
  ['supAdministrador'],
  ['superAdministrador']
),
  editarVentaPDV
);

// Eliminar venta — solo supAdministrador o perfil superAdministrador
router.delete('/ventas_pdv/:id', verifyToken, authorizeRolesOrProfiles(
  ['supAdministrador'],
  ['superAdministrador']
),
  eliminarVentaPDV
);

export default router;