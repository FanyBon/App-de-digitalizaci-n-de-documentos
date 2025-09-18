import { Router } from 'express';
import {
  listarCategorias,
  obtenerCategoria,
  crearCategoria,
  editarCategoria,
  eliminarCategoria
} from '../../controller/productos/categoriasArticulosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];
const rolesAdmin = ['admin','supAdministrador', 'supervisor'];
const perfilesAdmin = ['superAdministrador','supAdministrador', 'administrador externo'];
const rolesSoloAdmin = ['admin','supAdministrador'];
const perfilesSoloAdmin = ['superAdministrador','supAdministrador'];

// GET /categorias_articulos        → Listar categorías (roles básicos o perfiles básicos)
router.get('/categorias_articulos',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarCategorias
);

// GET /categorias_articulos/:id    → Obtener una categoría (roles básicos o perfiles básicos)
router.get('/categorias_articulos/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerCategoria
);

// POST /categorias_articulos       → Crear una categoría (admin y supervisor)
router.post('/categorias_articulos',verifyToken,authorizeRolesOrProfiles(rolesAdmin, perfilesAdmin),
  crearCategoria
);

// PUT /categorias_articulos/:id    → Editar una categoría (admin y supervisor)
router.put('/categorias_articulos/:id',verifyToken,authorizeRolesOrProfiles(rolesAdmin, perfilesAdmin),
  editarCategoria
);

// DELETE /categorias_articulos/:id → Eliminar una categoría (solo admin)
router.delete('/categorias_articulos/:id',verifyToken,authorizeRolesOrProfiles(rolesSoloAdmin, perfilesSoloAdmin),
  eliminarCategoria
);

export default router;