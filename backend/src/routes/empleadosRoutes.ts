// src/routes/empleadosRoutes.ts
import { Router } from 'express';
import {
  crearEmpleado,
  listarEmpleados,
  editarEmpleado,
  eliminarEmpleado,
  buscarEmpleados,
  actualizarMonederoEmpleado
} from '../controller/empleadosController';
import {
  verifyToken,
  authorizeRolesOrProfiles
} from '../middewares/authMiddleware';

const router = Router();

// Todos los endpoints de 'empleados' accesibles para roles espesificos:
const rolesPermitidos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesPermitidos = ['superAdministrador', 'administrador externo'];

// Crear empleado
router.post('/empleados',verifyToken,authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
crearEmpleado
);

// Listar empleados
router.get('/empleados',verifyToken,authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
  listarEmpleados
);

// Editar empleado
router.put('/empleados/:id',verifyToken,authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
  editarEmpleado
);

// **Eliminar empleado** — solo SUP ADMINISTRADORES
router.delete('/empleados/:id',verifyToken,authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
  ),
  eliminarEmpleado
);

// Buscar empleados
router.get('/empleados/search',verifyToken,authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
  buscarEmpleados
);

// Actualizar solo monedero de empleado
router.put('/empleados/:id/monedero',verifyToken,authorizeRolesOrProfiles(rolesPermitidos, perfilesPermitidos),
  actualizarMonederoEmpleado
);

export default router;
