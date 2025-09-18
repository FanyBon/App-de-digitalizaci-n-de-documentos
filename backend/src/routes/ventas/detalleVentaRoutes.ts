import { Router } from 'express';
import {
  listarDetallesVenta,
  obtenerDetalleVenta,
  crearDetalleVenta,
  editarDetalleVenta,
  eliminarDetalleVenta
} from '../../controller/ventas/detalleVentaController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles para ver y crear
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

// GET /detalle_venta
router.get('/detalle_venta', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarDetallesVenta
);

// GET /detalle_venta/:id
router.get('/detalle_venta/:id', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerDetalleVenta
);

// POST /detalle_venta
router.post('/detalle_venta', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  crearDetalleVenta
);

// PUT /detalle_venta/:id — solo supAdministrador o perfil superAdministrador
router.put('/detalle_venta/:id', verifyToken, authorizeRolesOrProfiles(['supAdministrador'], ['superAdministrador']),
  editarDetalleVenta
);

// DELETE /detalle_venta/:id — solo supAdministrador o perfil superAdministrador
router.delete('/detalle_venta/:id', verifyToken, authorizeRolesOrProfiles(['supAdministrador'], ['superAdministrador']),
  eliminarDetalleVenta
);

export default router;