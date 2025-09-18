import { Router } from 'express';
import {
  listarEmpresas,
  crearEmpresa,
  editarEmpresa,
  eliminarEmpresa,
  obtenerEmpresa
} from '../controller/empresa/empresasController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../middewares/authMiddleware';

const router = Router();

// Definición de roles y perfiles
const rolesLectura = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesLectura = ['superAdministrador', 'administrador externo'];
const rolesEscritura = ['supAdministrador', 'admin externo'];
const perfilesEscritura = ['superAdministrador', 'administrador externo'];
const rolesSoloSupAdmin = ['supAdministrador'];
const perfilesSoloSupAdmin = ['superAdministrador'];

// GET /empresas → Listar empresas
router.get('/empresas', verifyToken, authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  listarEmpresas
);

// GET /empresas/:id → Obtener empresa
router.get('/empresas/:id', verifyToken, authorizeRolesOrProfiles(rolesLectura, perfilesLectura),
  obtenerEmpresa
);

// POST /empresas → Crear empresa
router.post('/empresas', verifyToken, authorizeRolesOrProfiles(rolesEscritura, perfilesEscritura),
  crearEmpresa
);

// PUT /empresas/:id → Editar empresa
router.put('/empresas/:id', verifyToken, authorizeRolesOrProfiles(rolesEscritura, perfilesEscritura),
  editarEmpresa
);

// DELETE /empresas/:id → Eliminar empresa
router.delete(
  '/empresas/:id', verifyToken, authorizeRolesOrProfiles(rolesSoloSupAdmin, perfilesSoloSupAdmin),
  eliminarEmpresa
);

export default router;