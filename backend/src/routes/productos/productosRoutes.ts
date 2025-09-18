import { Router } from 'express';
import {
  listarProductos,
  obtenerProducto,
  crearProducto,
  editarProducto,
  eliminarProducto,
  buscarProducto
} from '../../controller/productos/productosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles permitidos
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];
const rolesCreaEdit = ['supAdministrador','admin', 'supervisor'];
const perfilesCreaEdit = ['supAdministrador','superAdministrador', 'administrador externo'];
const rolesDelete = ['supAdministrador','admin'];
const perfilesDelete = ['supAdministrador','superAdministrador'];

// GET /productos          → Ver todos los productos (roles básicos o perfiles básicos)
router.get('/productos',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarProductos
);

// GET /productos/:id      → Ver un producto por ID (roles básicos o perfiles básicos)
router.get('/productos/:id',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerProducto
);

// GET /productos/search   → Buscar productos (roles básicos o perfiles básicos)
router.get('/productos/search',verifyToken,authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  buscarProducto
);

// POST /productos         → Crear producto (solo admin o supervisor / perfiles asociados)
router.post(
  '/productos',verifyToken,authorizeRolesOrProfiles(rolesCreaEdit, perfilesCreaEdit),
  crearProducto
);

// PUT /productos/:id      → Editar producto (solo admin o supervisor / perfiles asociados)
router.put('/productos/:id',verifyToken,authorizeRolesOrProfiles(rolesCreaEdit, perfilesCreaEdit),
  editarProducto
);

// DELETE /productos/:id   → Eliminar producto (solo admin / perfil superAdministrador)
router.delete('/productos/:id',verifyToken,authorizeRolesOrProfiles(rolesDelete, perfilesDelete),
  eliminarProducto
);

export default router;