import { Router } from 'express';
import {
  listarFamiliasProductos,
  obtenerFamiliaProducto,
  crearFamiliaProducto,
  editarFamiliaProducto,
  eliminarFamiliaProducto
} from '../../controller/productos/familiasProductosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles permitidos
const rolesBasicos = ['supAdministrador', 'admin', 'supervisor'];
const perfilesBasicos = ['superAdministrador'];        // perfil de supAdministrador
const rolesAdminOnly = ['supAdministrador'];
const perfilesAdminOnly = ['superAdministrador'];

// GET /familias_productos       → Ver todos (roles básicos/perfiles básicos)
router.get(
  '/familias_productos', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarFamiliasProductos
);

// GET /familias_productos/:id   → Ver uno por ID (roles básicos/perfiles básicos)
router.get('/familias_productos/:id', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  obtenerFamiliaProducto
);

// POST /familias_productos      → Crear uno (roles básicos/perfiles básicos)
router.post('/familias_productos', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  crearFamiliaProducto
);

// PUT /familias_productos/:id   → Editar (solo supAdministrador/perfil superAdministrador)
router.put('/familias_productos/:id', verifyToken, authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  editarFamiliaProducto
);

// DELETE /familias_productos/:id → Eliminar (solo supAdministrador/perfil superAdministrador)
router.delete('/familias_productos/:id', verifyToken, authorizeRolesOrProfiles(rolesAdminOnly, perfilesAdminOnly),
  eliminarFamiliaProducto
);

export default router;