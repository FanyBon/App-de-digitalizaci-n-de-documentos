// src/routes/usuarios/usuarioUbicacionesRoutes.ts
import { Router } from 'express';
import {
  getUsuarioUbicaciones,
  getUsuarioUbicacionesByUsuario,
  getUsuarioUbicacionesByUbicacion,
  getUsuarioUbicacion,
  createUsuarioUbicacion,
  updateUsuarioUbicacion,
  activateUsuarioUbicacion,
  deleteUsuarioUbicacion,
  deleteUsuarioUbicacionPermanent,
  getHistorialUsuarioUbicacion
} from '../../../controller/usuarios_plataforma/usuario_ubicacion/usuarioUbicacionesController';
import { verifyToken } from '../../../middewares/authMiddleware';
import { authorize } from '../../../middewares/authorize';

const router = Router();

// ====================================
// RUTAS DE CONSULTA
// ====================================

/**
 * @route   GET /api/usuario-ubicaciones
 * @desc    Listar todas las asignaciones usuario-ubicación
 * @access  Requiere permiso: usuario_ubicaciones.listar
 */
router.get(
  '/usuario-ubicaciones',
  verifyToken,
  authorize('usuario_ubicaciones', 'listar'),
  getUsuarioUbicaciones
);

/**
 * @route   GET /api/usuario-ubicaciones/usuario/:usuarioId
 * @desc    Listar ubicaciones de un usuario específico
 * @access  Requiere permiso: usuario_ubicaciones.listar
 */
router.get(
  '/usuario-ubicaciones/usuario/:usuarioId',
  verifyToken,
  authorize('usuario_ubicaciones', 'listar'),
  getUsuarioUbicacionesByUsuario
);

/**
 * @route   GET /api/usuario-ubicaciones/ubicacion/:ubicacionId
 * @desc    Listar usuarios asignados a una ubicación
 * @access  Requiere permiso: usuario_ubicaciones.listar
 */
router.get(
  '/usuario-ubicaciones/ubicacion/:ubicacionId',
  verifyToken,
  authorize('usuario_ubicaciones', 'listar'),
  getUsuarioUbicacionesByUbicacion
);

/**
 * @route   GET /api/usuario-ubicaciones/:id/historial
 * @desc    Obtener historial de cambios (auditoría) de una asignación
 * @access  Requiere permiso: usuario_ubicaciones.listar
 */
router.get(
  '/usuario-ubicaciones/:id/historial',
  verifyToken,
  authorize('usuario_ubicaciones', 'listar'),
  getHistorialUsuarioUbicacion
);

/**
 * @route   GET /api/usuario-ubicaciones/:id
 * @desc    Obtener una asignación por ID
 * @access  Requiere permiso: usuario_ubicaciones.listar
 */
router.get(
  '/usuario-ubicaciones/:id',
  verifyToken,
  authorize('usuario_ubicaciones', 'listar'),
  getUsuarioUbicacion
);

// ====================================
// RUTAS DE MODIFICACIÓN
// ====================================

/**
 * @route   POST /api/usuario-ubicaciones
 * @desc    Crear nueva asignación usuario-ubicación
 * @access  Requiere permiso: usuario_ubicaciones.crear
 */
router.post(
  '/usuario-ubicaciones',
  verifyToken,
  authorize('usuario_ubicaciones', 'crear'),
  createUsuarioUbicacion
);

/**
 * @route   PUT /api/usuario-ubicaciones/:id
 * @desc    Actualizar una asignación (cambiar estado)
 * @access  Requiere permiso: usuario_ubicaciones.editar
 */
router.put(
  '/usuario-ubicaciones/:id',
  verifyToken,
  authorize('usuario_ubicaciones', 'editar'),
  updateUsuarioUbicacion
);

/**
 * @route   PATCH /api/usuario-ubicaciones/:id/activate
 * @desc    Reactivar una asignación desactivada
 * @access  Requiere permiso: usuario_ubicaciones.editar
 */
router.patch(
  '/usuario-ubicaciones/:id/activate',
  verifyToken,
  authorize('usuario_ubicaciones', 'editar'),
  activateUsuarioUbicacion
);

// ====================================
// RUTAS DE ELIMINACIÓN
// ====================================

/**
 * @route   DELETE /api/usuario-ubicaciones/:id
 * @desc    Desactivar asignación (soft delete)
 * @access  Requiere permiso: usuario_ubicaciones.eliminar
 */
router.delete(
  '/usuario-ubicaciones/:id',
  verifyToken,
  authorize('usuario_ubicaciones', 'eliminar'),
  deleteUsuarioUbicacion
);

/**
 * @route   DELETE /api/usuario-ubicaciones/:id/permanent
 * @desc    Eliminar permanentemente una asignación
 * @access  Requiere permiso: usuario_ubicaciones.eliminar_permanente
 */
router.delete(
  '/usuario-ubicaciones/:id/permanent',
  verifyToken,
  authorize('usuario_ubicaciones', 'eliminar_permanente'),
  deleteUsuarioUbicacionPermanent
);

export default router;