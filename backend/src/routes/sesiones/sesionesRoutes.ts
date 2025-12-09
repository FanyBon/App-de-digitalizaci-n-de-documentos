// src/routes/sesiones/sesionesRoutes.ts
import { Router } from 'express';
import {
  iniciarSesion,
  cerrarSesion,
  getMiSesion,
  getSesiones,
  getSesionesActivas,
  getSesion,
  getHistorialUsuario,
  forzarCierreSesion,
  getEstadisticas,
  getHistorialSesion
} from '../../controller/sesiones/sesionesController';
import { verifyToken, authorizeRoles } from '../../middewares/authMiddleware';

const router = Router();

// ============================================
// RUTAS DE SESIÓN DEL USUARIO
// ============================================

// Iniciar sesión operativa
router.post(
  '/sesiones/iniciar',
  verifyToken,
  iniciarSesion
);

// Cerrar sesión operativa
router.post(
  '/sesiones/cerrar',
  verifyToken,
  cerrarSesion
);

// Ver mi sesión activa
router.get(
  '/sesiones/mi-sesion',
  verifyToken,
  getMiSesion
);

// ============================================
// RUTAS DE CONSULTA (ADMIN)
// ============================================

// Listar sesiones activas
router.get(
  '/sesiones/activas',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  getSesionesActivas
);

// Estadísticas
router.get(
  '/sesiones/estadisticas',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  getEstadisticas
);

// Historial de usuario
router.get(
  '/sesiones/usuario/:usuarioId/historial',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  getHistorialUsuario
);

// Historial de auditoría
router.get(
  '/sesiones/:id/historial',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  getHistorialSesion
);

// Ver sesión por ID
router.get(
  '/sesiones/:id',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  getSesion
);

// Listar sesiones con filtros
router.get(
  '/sesiones',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  getSesiones
);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

// Forzar cierre de sesión
router.post(
  '/sesiones/:id/forzar-cierre',
  verifyToken,
  authorizeRoles(['supAdministrador', 'administrador']),
  forzarCierreSesion
);

export default router;