import { Router } from 'express';
import {
  listarPerfiles,
  obtenerPerfil,
  crearPerfil,
  editarPerfil,
  eliminarPerfil
} from '../../controller/usuarios_plataforma/perfilesController';
import { verifyToken, authorizeRoles } from '../../middewares/authMiddleware';

const router = Router();

// Solo supAdministrador puede gestionar perfiles
const adminOnly: string[] = ['supAdministrador'];

// GET /perfiles    → Listar todos los perfiles (acceso general autenticado)
router.get('/perfiles',verifyToken,
  listarPerfiles
);

// GET /perfiles/:id → Obtener un perfil específico (solo supAdministrador)
router.get('/perfiles/:id',verifyToken,authorizeRoles(adminOnly),
  obtenerPerfil
);

// POST /perfiles   → Crear un nuevo perfil (solo supAdministrador)
router.post('/perfiles',verifyToken,authorizeRoles(adminOnly),
  crearPerfil
);

// PUT /perfiles/:id → Editar un perfil existente (solo supAdministrador)
router.put('/perfiles/:id',verifyToken,authorizeRoles(adminOnly),editarPerfil
);

// DELETE /perfiles/:id → Eliminar un perfil (solo supAdministrador)
router.delete('/perfiles/:id',verifyToken,authorizeRoles(adminOnly),
  eliminarPerfil
);

export default router;