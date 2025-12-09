// src/routes/empleadosRoutes.ts
import { Router } from 'express';
import {
  crearEmpleado,
  listarEmpleados,
  obtenerEmpleado,
  obtenerHistorialEmpleado,
  editarEmpleado,
  desactivarEmpleado,
  reactivarEmpleado,
  eliminarEmpleado,
  buscarEmpleados,
  actualizarMonederoEmpleado,
  setNip
} from '../../controller/empleados/empleadosController';
import { verifyToken } from '../../middewares/authMiddleware';
import { authorize } from '../../middewares/authorize';

const router = Router();

// ====================================
// RUTAS DE EMPLEADOS
// ====================================

/**
 * @route   POST /api/empleados
 * @desc    Crear un nuevo empleado
 * @access  Requiere permiso: empleados.crear
 */
router.post(
  '/empleados',
  verifyToken,
  authorize('empleados', 'crear'),
  crearEmpleado
);

/**
 * @route   GET /api/empleados
 * @desc    Listar todos los empleados (activos por defecto)
 * @query   incluir_inactivos=true (opcional) - incluye empleados inactivos
 * @access  Requiere permiso: empleados.listar
 */
router.get(
  '/empleados',
  verifyToken,
  authorize('empleados', 'listar'),
  listarEmpleados
);

/**
 * @route   GET /api/empleados/search
 * @desc    Buscar empleados por nombre, cédula, código de barras o QR
 * @query   q (string, requerido) - término de búsqueda
 * @query   incluir_inactivos=true (opcional) - incluye empleados inactivos
 * @access  Requiere permiso: empleados.buscar
 */
router.get(
  '/empleados/search',
  verifyToken,
  authorize('empleados', 'buscar'),
  buscarEmpleados
);

/**
 * @route   GET /api/empleados/:id
 * @desc    Obtener un empleado por ID
 * @access  Requiere permiso: empleados.listar
 */
router.get(
  '/empleados/:id',
  verifyToken,
  authorize('empleados', 'listar'),
  obtenerEmpleado
);

/**
 * @route   GET /api/empleados/:id/historial
 * @desc    Obtener historial de cambios (auditoría) de un empleado
 * @access  Requiere permiso: empleados.listar
 */
router.get(
  '/empleados/:id/historial',
  verifyToken,
  authorize('empleados', 'listar'),
  obtenerHistorialEmpleado
);

/**
 * @route   PUT /api/empleados/:id
 * @desc    Editar un empleado existente
 * @access  Requiere permiso: empleados.editar
 */
router.put(
  '/empleados/:id',
  verifyToken,
  authorize('empleados', 'editar'),
  editarEmpleado
);

/**
 * @route   PATCH /api/empleados/:id/desactivar
 * @desc    Desactivar un empleado (soft delete)
 * @access  Requiere permiso: empleados.eliminar
 */
router.patch(
  '/empleados/:id/desactivar',
  verifyToken,
  authorize('empleados', 'eliminar'),
  desactivarEmpleado
);

/**
 * @route   PATCH /api/empleados/:id/reactivar
 * @desc    Reactivar un empleado previamente desactivado
 * @access  Requiere permiso: empleados.editar
 */
router.patch(
  '/empleados/:id/reactivar',
  verifyToken,
  authorize('empleados', 'editar'),
  reactivarEmpleado
);

/**
 * @route   DELETE /api/empleados/:id
 * @desc    Eliminar permanentemente un empleado
 * @access  Requiere permiso: empleados.eliminar_permanente
 * @note    Solo para superadministradores
 */
router.delete(
  '/empleados/:id',
  verifyToken,
  authorize('empleados', 'eliminar_permanente'),
  eliminarEmpleado
);

/**
 * @route   PUT /api/empleados/:id/monedero
 * @desc    Actualizar solo el monedero_id de un empleado
 * @access  Requiere permiso: empleados.actualizar_monedero
 */
router.put(
  '/empleados/:id/monedero',
  verifyToken,
  authorize('empleados', 'actualizar_monedero'),
  actualizarMonederoEmpleado
);

/**
 * @route   POST /api/empleados/:id/nip
 * @desc    Establecer/actualizar el NIP de un empleado
 * @access  Requiere permiso: empleados.gestionar_nip
 */
router.post(
  '/empleados/:id/nip',
  verifyToken,
  authorize('empleados', 'gestionar_nip'),
  setNip
);

export default router;