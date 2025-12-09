// src/routes/empresa/puntosVentaRoutes.ts
import { Router } from 'express';
import {
    getPuntosVenta,
    getPuntosVentaByUbicacion,
    getPuntosVentaByEmpresa,
    getPuntoVenta,
    getPuntoVentaByCodigo,
    createPuntoVenta,
    updatePuntoVenta,
    deletePuntoVenta,
    deletePuntoVentaPermanent,
    reactivatePuntoVenta,
    getHistorialPuntoVenta
} from '../../../controller/empresa/dispositivos/puntosVentaController';
import { verifyToken } from '../../../middewares/authMiddleware';
import { authorize } from '../../../middewares/authorize';

const router = Router();

// ============================================
// RUTAS DE CONSULTA
// ============================================

/**
  GET /api/puntos-venta
  Listar todos los puntos de venta
  Requiere: pdv.listar
 */
router.get(
    '/puntos-venta',
    verifyToken,
    authorize('pdv.listar'),
    getPuntosVenta
);

/**
  GET /api/puntos-venta/ubicacion/:ubicacionId
  Listar puntos de venta por ubicación
  Requiere: pdv.listar
 */
router.get(
    '/puntos-venta/ubicacion/:ubicacionId',
    verifyToken,
    authorize('pdv.listar'),
    getPuntosVentaByUbicacion
);

/**
  GET /api/puntos-venta/empresa/:empresaId
  Listar puntos de venta por empresa
  Requiere: pdv.listar
 */
router.get(
    '/puntos-venta/empresa/:empresaId',
    verifyToken,
    authorize('pdv.listar'),
    getPuntosVentaByEmpresa
);

/**
  GET /api/puntos-venta/codigo/:codigo
  Buscar punto de venta por código
  Requiere: pdv.ver
 */
router.get(
    '/puntos-venta/codigo/:codigo',
    verifyToken,
    authorize('pdv.ver'),
    getPuntoVentaByCodigo
);

/**
  GET /api/puntos-venta/:id/historial
  Ver historial de auditoría de un punto de venta
  Requiere: pdv.ver_historial
 */
router.get(
    '/puntos-venta/:id/historial',
    verifyToken,
    authorize('pdv.ver_historial'),
    getHistorialPuntoVenta
);

/**
  GET /api/puntos-venta/:id
  Ver detalle de un punto de venta específico
  Requiere: pdv.ver
  IMPORTANTE: Esta ruta debe ir AL FINAL de todas las rutas GET
  para evitar que /:id capture rutas como /codigo/:codigo
 */
router.get(
    '/puntos-venta/:id',
    verifyToken,
    authorize('pdv.ver'),
    getPuntoVenta
);

// ============================================
// RUTAS DE MODIFICACIÓN
// ============================================

/**
  POST /api/puntos-venta
  Crear nuevo punto de venta
  Requiere: pdv.crear
 */
router.post(
    '/puntos-venta',
    verifyToken,
    authorize('pdv.crear'),
    createPuntoVenta
);

/**
  PUT /api/puntos-venta/:id
  Actualizar punto de venta existente
  Requiere: pdv.editar
 */
router.put(
    '/puntos-venta/:id',
    verifyToken,
    authorize('pdv.editar'),
    updatePuntoVenta
);

/**
  PATCH /api/puntos-venta/:id/reactivate
  Reactivar punto de venta desactivado
  Requiere: pdv.cambiar_status
 */
router.patch(
    '/puntos-venta/:id/reactivate',
    verifyToken,
    authorize('pdv.cambiar_status'),
    reactivatePuntoVenta
);

// ============================================
// RUTAS DE ELIMINACIÓN
// ============================================

/**
  DELETE /api/puntos-venta/:id/permanent
  Eliminar punto de venta PERMANENTEMENTE de la BD
  Requiere: pdv.eliminar
  IMPORTANTE: Esta ruta debe ir ANTES de DELETE /:id
 */
router.delete(
    '/puntos-venta/:id/permanent',
    verifyToken,
    authorize('pdv.eliminar'),
    deletePuntoVentaPermanent
);

/**
  DELETE /api/puntos-venta/:id
  Desactivar punto de venta (soft delete)
  Requiere: pdv.eliminar
 */
router.delete(
    '/puntos-venta/:id',
    verifyToken,
    authorize('pdv.eliminar'),
    deletePuntoVenta
);

export default router;