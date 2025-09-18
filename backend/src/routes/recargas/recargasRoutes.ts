import { Router } from 'express';
import {
  listarRecargas,
  obtenerRecarga,
  crearRecarga,
  editarRecarga,
  eliminarRecarga
} from '../../controller/recargas/recargasController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definimos los arrays una sola vez
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

const rolesAdminOnly = ['supAdministrador'];
const perfilesAdminOnly = ['superAdministrador'];

// GET /recargas          → Ver todas (roles básicos o perfiles básicos)
router.get('/recargas',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarRecargas
);

// GET /recargas/:id      → Ver una por ID (roles básicos o perfiles básicos)
router.get('/recargas/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerRecarga
);

// POST /recargas         → Crear nueva recarga (roles básicos o perfiles básicos)
router.post('/recargas',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  crearRecarga
);

// PUT /recargas/:id      → Editar recarga (solo supAdministrador / superAdministrador)
router.put('/recargas/:id',verifyToken,authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  editarRecarga
);

// DELETE /recargas/:id   → Eliminar recarga (solo supAdministrador / superAdministrador)
router.delete('/recargas/:id',verifyToken,authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  eliminarRecarga
);

export default router;