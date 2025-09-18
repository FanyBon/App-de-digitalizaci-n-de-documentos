import { Router } from 'express';
import {
  listarSubsidiosUtilizados,
  obtenerSubsidioUtilizado,
  crearSubsidioUtilizado,
  editarSubsidioUtilizado,
  eliminarSubsidioUtilizado
} from '../../controller/productos/subsidiosUtilizadosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];
const rolesAdminOnly = ['supAdministrador'];
const perfilesAdminOnly = ['superAdministrador'];

// GET /subsidios_utilizados        → Ver todos los subsidios utilizados (roles básicos o perfiles básicos)
router.get('/subsidios_utilizados',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarSubsidiosUtilizados
);

// GET /subsidios_utilizados/:id    → Ver un subsidio utilizado por ID (roles básicos o perfiles básicos)
router.get('/subsidios_utilizados/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerSubsidioUtilizado
);

// POST /subsidios_utilizados       → Crear un subsidio utilizado (roles básicos o perfiles básicos)
router.post('/subsidios_utilizados',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  crearSubsidioUtilizado
);

// PUT /subsidios_utilizados/:id    → Editar un subsidio utilizado (solo supAdministrador / superAdministrador)
router.put('/subsidios_utilizados/:id',verifyToken,authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  editarSubsidioUtilizado
);

// DELETE /subsidios_utilizados/:id → Eliminar un subsidio utilizado (solo supAdministrador / superAdministrador)
router.delete('/subsidios_utilizados/:id',verifyToken,authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  eliminarSubsidioUtilizado
);

export default router;