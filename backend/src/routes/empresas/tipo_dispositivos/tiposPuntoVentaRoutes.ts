// src/routes/empresa/tiposPuntoVentaRoutes.ts
import { Router } from 'express';
import {
  getTiposPuntoVenta,
  getTipoPuntoVenta,
  getTipoPuntoVentaByCodigo,
  createTipoPuntoVenta,
  updateTipoPuntoVenta,
  deleteTipoPuntoVenta,
  reactivateTipoPuntoVenta,
  getHistorialTipoPuntoVenta
} from '../../../controller/empresa/tipo_dispositivos/tiposPuntoVentaController';
import { verifyToken } from '../../../middewares/authMiddleware';
import { authorize } from '../../../middewares/authorize';

const router = Router();

// ============================================
// RUTAS DE CONSULTA
// ============================================

/**
 * GET /api/tipos-punto-venta
 * Listar todos los tipos de punto de venta
 * Requiere: dispositivos.listar
 */
router.get(
  '/tipos-punto-venta',
  verifyToken,
  authorize('dispositivos.listar'),
  getTiposPuntoVenta
);

/**
 * GET /api/tipos-punto-venta/codigo/:codigo
 * Buscar tipo por código
 * Requiere: dispositivos.ver
 */
router.get(
  '/tipos-punto-venta/codigo/:codigo',
  verifyToken,
  authorize('dispositivos.ver'),
  getTipoPuntoVentaByCodigo
);

/**
 * GET /api/tipos-punto-venta/:id/historial
 * Ver historial de auditoría de un tipo
 * Requiere: dispositivos.ver_historial
 */
router.get(
  '/tipos-punto-venta/:id/historial',
  verifyToken,
  authorize('dispositivos.ver_historial'),
  getHistorialTipoPuntoVenta
);

/**
 * GET /api/tipos-punto-venta/:id
 * Ver detalle de un tipo específico
 * Requiere: dispositivos.ver
 * IMPORTANTE: Esta ruta debe ir AL FINAL de todas las rutas GET
 */
router.get(
  '/tipos-punto-venta/:id',
  verifyToken,
  authorize('dispositivos.ver'),
  getTipoPuntoVenta
);

// ============================================
// RUTAS DE MODIFICACIÓN
// ============================================

/**
 * POST /api/tipos-punto-venta
 * Crear nuevo tipo de punto de venta
 * Requiere: dispositivos.crear
 */
router.post(
  '/tipos-punto-venta',
  verifyToken,
  authorize('dispositivos.crear'),
  createTipoPuntoVenta
);

/**
 * PUT /api/tipos-punto-venta/:id
 * Actualizar tipo de punto de venta existente
 * Requiere: dispositivos.editar
 */
router.put(
  '/tipos-punto-venta/:id',
  verifyToken,
  authorize('dispositivos.editar'),
  updateTipoPuntoVenta
);

/**
 * PATCH /api/tipos-punto-venta/:id/reactivate
 * Reactivar tipo desactivado
 * Requiere: dispositivos.cambiar_status
 */
router.patch(
  '/tipos-punto-venta/:id/reactivate',
  verifyToken,
  authorize('dispositivos.cambiar_status'),
  reactivateTipoPuntoVenta
);

// ============================================
// RUTAS DE ELIMINACIÓN
// ============================================

/**
 * DELETE /api/tipos-punto-venta/:id
 * Desactivar tipo de punto de venta (soft delete)
 * Requiere: dispositivos.eliminar
 */
router.delete(
  '/tipos-punto-venta/:id',
  verifyToken,
  authorize('dispositivos.eliminar'),
  deleteTipoPuntoVenta
);

export default router;