import { Router } from 'express';
import {
  listarMetodosPago,
  obtenerMetodoPago,
  crearMetodoPago,
  editarMetodoPago,
  eliminarMetodoPago
} from '../../controller/metodo_pago/metodosPagoController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];
const rolesAdmin = ['admin', 'supervisor'];
const perfilesAdmin = ['superAdministrador', 'administrador externo'];
const rolesSoloAdmin = ['admin'];
const perfilesSoloAdmin = ['superAdministrador'];

// GET /metodos_pago        → Listar métodos de pago (roles básicos o perfiles básicos)
router.get('/metodos_pago',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarMetodosPago
);

// GET /metodos_pago/:id    → Obtener método de pago (roles básicos o perfiles básicos)
router.get('/metodos_pago/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerMetodoPago
);

// POST /metodos_pago       → Crear método de pago (admin y supervisor)
router.post('/metodos_pago',verifyToken,authorizeRolesOrProfiles(rolesAdmin, perfilesAdmin),
  crearMetodoPago
);

// PUT /metodos_pago/:id    → Editar método de pago (admin y supervisor)
router.put('/metodos_pago/:id',verifyToken,authorizeRolesOrProfiles(rolesAdmin, perfilesAdmin),
  editarMetodoPago
);

// DELETE /metodos_pago/:id → Eliminar método de pago (solo admin)
router.delete('/metodos_pago/:id',verifyToken,authorizeRolesOrProfiles(rolesSoloAdmin, perfilesSoloAdmin),
  eliminarMetodoPago
);

export default router;