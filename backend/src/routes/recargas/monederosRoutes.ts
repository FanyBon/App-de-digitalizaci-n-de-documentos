// src/routes/recargas/monederosRoutes.ts
import { Router } from 'express';
import {
  listarMonederos,
  obtenerMonedero,
  crearMonedero,
  editarMonedero,
  eliminarMonedero,
  eliminarMonederoPermanente,
  consultarSaldo,
  consultarSaldoQR      
} from '../../controller/recargas/monederosController';
import { verifyToken } from '../../middewares/authMiddleware';
import { authorize } from '../../middewares/authorize';

const router = Router();

// ====================================
// RUTAS DE MONEDEROS
// ====================================

/**
 * @route   GET /api/monederos
 * @desc    Listar todos los monederos activos
 * @access  Requiere permiso: monederos.listar
 */
router.get(
  '/monederos',
  verifyToken,
  authorize('monederos', 'listar'),
  listarMonederos
);

/**
 * @route   GET /api/monederos/:id
 * @desc    Obtener un monedero por ID
 * @access  Requiere permiso: monederos.listar
 */
router.get(
  '/monederos/:id',
  verifyToken,
  authorize('monederos', 'listar'),
  obtenerMonedero
);

/**
 * @route   GET /api/monederos/saldo/:codigo
 * @desc    Consultar saldo por código de barras (sin autenticación)
 * @access  Público
 */
router.get(
  '/monederos/saldo/:codigo',
  consultarSaldo
);

/**
 * @route   GET /api/monederos/saldo/qr/:qr
 * @desc    Consultar saldo por código QR (sin autenticación)
 * @access  Público
 */
router.get(
  '/monederos/saldo/qr/:qr',
  consultarSaldoQR
);

/**
 * @route   POST /api/monederos
 * @desc    Crear un nuevo monedero
 * @access  Requiere permiso: monederos.crear
 */
router.post(
  '/monederos',
  verifyToken,
  authorize('monederos', 'crear'),
  crearMonedero
);

/**
 * @route   PUT /api/monederos/:id
 * @desc    Editar un monedero existente
 * @access  Requiere permiso: monederos.editar
 */
router.put(
  '/monederos/:id',
  verifyToken,
  authorize('monederos', 'editar'),
  editarMonedero
);

/**
 * @route   DELETE /api/monederos/:id
 * @desc    Eliminar (desactivar) un monedero
 * @access  Requiere permiso: monederos.eliminar
 */
router.delete(
  '/monederos/:id',
  verifyToken,
  authorize('monederos', 'eliminar'),
  eliminarMonedero
);

/**
 * @route   DELETE /api/monederos/:id/permanente
 * @desc    Eliminar permanentemente un monedero
 * @access  Requiere permiso: monederos.eliminar_permanente
 */
router.delete(
  '/monederos/:id/permanente',
  verifyToken,
  authorize('monederos', 'eliminar_permanente'),
  eliminarMonederoPermanente
);

export default router;