// src/routes/ubicaciones/ubicacionesRoutes.ts
import { Router } from 'express';
import {
  getUbicaciones,
  getUbicacion,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion,
  deleteUbicacionPermanent,
  reactivateUbicacion,
  getHistorialUbicacion
} from '../../controller/empresa/ubicacionesController';
import { verifyToken } from '../../middewares/authMiddleware';
import { authorize } from '../../middewares/authorize';

const router = Router();

// ============================================
// RUTAS DE CONSULTA
// ============================================

/**
 * GET /api/ubicaciones
 * Listar todas las ubicaciones
 * Requiere: ubicaciones.listar
 */
router.get(
  '/ubicaciones',
  verifyToken,
  authorize('ubicaciones.listar'), // ✅ CORRECTO
  getUbicaciones
);

/**
 * GET /api/ubicaciones/:id
 * Ver detalle de una ubicación
 * Requiere: ubicaciones.ver
 */
router.get(
  '/ubicaciones/:id',
  verifyToken,
  authorize('ubicaciones.ver'), // ✅ CORRECTO
  getUbicacion
);

/**
 * GET /api/ubicaciones/:id/historial
 * Ver historial de auditoría de una ubicación
 * Requiere: ubicaciones.ver_historial
 */
router.get(
  '/ubicaciones/:id/historial',
  verifyToken,
  authorize('ubicaciones.ver_historial'), // ✅ CORREGIDO (con guión bajo)
  getHistorialUbicacion
);

// ============================================
// RUTAS DE MODIFICACIÓN
// ============================================

/**
 * POST /api/ubicaciones
 * Crear nueva ubicación
 * Requiere: ubicaciones.crear
 */
router.post(
  '/ubicaciones',
  verifyToken,
  authorize('ubicaciones.crear'), // ✅ CORRECTO
  createUbicacion
);

/**
 * PUT /api/ubicaciones/:id
 * Actualizar ubicación existente
 * Requiere: ubicaciones.editar
 */
router.put(
  '/ubicaciones/:id',
  verifyToken,
  authorize('ubicaciones.editar'), // ✅ CORRECTO
  updateUbicacion
);

// ============================================
// RUTAS DE ELIMINACIÓN
// ============================================

/**
 * DELETE /api/ubicaciones/:id
 * Desactivar ubicación (soft delete)
 * Requiere: ubicaciones.eliminar
 */
router.delete(
  '/ubicaciones/:id',
  verifyToken,
  authorize('ubicaciones.eliminar'), // ✅ CORRECTO
  deleteUbicacion
);

/**
 * DELETE /api/ubicaciones/:id/permanent
 * Eliminar ubicación PERMANENTEMENTE de la BD
 * Requiere: ubicaciones.eliminar_permanente
 */
router.delete(
  '/ubicaciones/:id/permanent',
  verifyToken,
  authorize('ubicaciones.eliminar_permanente'), // ⚠️ FALTA CREAR ESTE PERMISO EN BD
  deleteUbicacionPermanent
);

// ============================================
// RUTAS DE REACTIVACIÓN
// ============================================

/**
 * PATCH /api/ubicaciones/:id/reactivate
 * Reactivar ubicación desactivada
 * Requiere: ubicaciones.reactivar
 */
router.patch(
  '/ubicaciones/:id/reactivate',
  verifyToken,
  authorize('ubicaciones.reactivar'), // ⚠️ FALTA CREAR ESTE PERMISO EN BD
  reactivateUbicacion
);

export default router;