// src/routes/loggin/authRoutescontrolcomidas.ts
import { Router } from 'express';
import { 
  login, 
  selectUbicacion, 
  selectPuntoVenta, 
  logout,
  getSessionStatus 
} from '../../controller/loggin/authController';
import { verifyToken } from '../../middewares/authMiddleware';
import { requireActiveSession } from '../../middewares/sessionMiddleware';

const router = Router();

// Ruta pública - Login (no requiere token)
router.post('/login', login);

// Rutas protegidas - Requieren token JWT
router.post('/auth/select-ubicacion', verifyToken, selectUbicacion);
router.post('/auth/select-punto-venta', verifyToken, selectPuntoVenta);
router.post('/auth/logout', verifyToken, logout);
router.get('/auth/session-status', verifyToken, getSessionStatus);

router.get(
  '/auth/test-session', 
  verifyToken, 
  requireActiveSession, 
  (req, res) => {
    res.status(200).json({
      mensaje: '✅ Sesión validada correctamente',
      usuario: {
        id: req.user?.id,
        nombre: req.user?.nombre_usuario,
        empresa: req.user?.empresa_nombre
      },
      sesion_activa: {
        sesion_id: req.session?.sesion_id,
        ubicacion: req.session?.ubicacion_nombre,
        punto_venta: req.session?.punto_venta_nombre,
        codigo_pv: req.session?.punto_venta_codigo
      }
    });
  }
);

export default router;