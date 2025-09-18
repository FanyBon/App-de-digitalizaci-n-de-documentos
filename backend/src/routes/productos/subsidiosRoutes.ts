import { Router } from 'express';
import {
  listarSubsidios,
  obtenerSubsidio,
  crearSubsidio,
  editarSubsidio,
  eliminarSubsidio
} from '../../controller/productos/subsidiosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles permitidos
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];
const rolesAdminOnly = ['supAdministrador'];
const perfilesAdminOnly = ['superAdministrador'];

// GET /subsidios        → Ver todos los subsidios (roles básicos o perfiles básicos)
router.get('/subsidios',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarSubsidios
);

// GET /subsidios/:id    → Ver un subsidio por ID (roles básicos o perfiles básicos)
router.get('/subsidios/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerSubsidio
);

// POST /subsidios       → Crear un subsidio (roles básicos o perfiles básicos)
router.post('/subsidios',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  crearSubsidio
);

// PUT /subsidios/:id    → Editar un subsidio (solo supAdministrador / perfil superAdministrador)
router.put('/subsidios/:id',verifyToken,authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  editarSubsidio
);

// DELETE /subsidios/:id → Eliminar un subsidio (solo supAdministrador / perfil superAdministrador)
router.delete('/subsidios/:id',verifyToken,authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  eliminarSubsidio
);

export default router;