// src/routes/empresas/empresasRoutes.ts
import { Router } from 'express';
import * as controller from '../../controller/empresa/empresasController';
import { verifyToken } from '../../middewares/authMiddleware';
import { authorize } from '../../middewares/authorize';

const router = Router();

/**
 * GET /api/empresas
 * Listar todas las empresas
 * Requiere: empresas.listar
 */
router.get(
  '/empresas', 
  verifyToken, 
  authorize('empresas.listar'), 
  controller.listarEmpresas
);

/**
 * GET /api/empresas/:id
 * Ver detalle de una empresa
 * Requiere: empresas.ver
 */
router.get(
  '/empresas/:id', 
  verifyToken, 
  authorize('empresas.ver'), 
  controller.obtenerEmpresa
);

/**
 * GET /api/empresas/:id/historial
 * Ver historial de auditoría de una empresa
 * Requiere: empresas.ver_historial
 */
router.get(
  '/empresas/:id/historial', 
  verifyToken, 
  authorize('empresas.ver_historial'), // ✅ CORREGIDO (con guión bajo)
  controller.obtenerHistorialEmpresa
);

/**
 * POST /api/empresas
 * Crear nueva empresa
 * Requiere: empresas.crear
 */
router.post(
  '/empresas', 
  verifyToken, 
  authorize('empresas.crear'), 
  controller.crearEmpresa
);

/**
 * PUT /api/empresas/:id
 * Actualizar empresa existente
 * Requiere: empresas.editar
 */
router.put(
  '/empresas/:id', 
  verifyToken, 
  authorize('empresas.editar'), 
  controller.editarEmpresa
);

/**
 * PATCH /api/empresas/:id/status
 * Cambiar estatus de empresa (activo/inactivo/suspendido)
 * Requiere: empresas.cambiar_status
 */
router.patch(
  '/empresas/:id/status', 
  verifyToken, 
  authorize('empresas.cambiar_status'), // ✅ CORREGIDO (sin guión bajo en "status")
  controller.cambiarEstatusEmpresa
);

/**
 * DELETE /api/empresas/:id
 * Eliminar empresa permanentemente
 * Requiere: empresas.eliminar
 */
router.delete(
  '/empresas/:id', 
  verifyToken, 
  authorize('empresas.eliminar'), 
  controller.eliminarEmpresa
);

export default router;