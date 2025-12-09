import { Router } from 'express'
import {
    listarReportes,
    reportePorEmpleado,
    crearReporte,
    editarReporte,
    eliminarReporte
} from '../../controller/reportes/reportesController'
import {
    verifyToken,
    authorizeRolesOrProfiles
} from '../../middewares/authMiddleware'

const router = Router()

// Sólo roles supAdministrador, admin externo, admin, supervisor o usuario
// o perfiles superAdministrador, administrador externo
router.get('/reportes', verifyToken, authorizeRolesOrProfiles(
    ['supAdministrador', 'admin externo', 'admin', 'supervisor'],
    ['superAdministrador', 'administrador externo']
),
    listarReportes
)

// GET /reportes/por-empleado
router.get(
  '/reportes/por-empleado',
  verifyToken,
  authorizeRolesOrProfiles(
    ['supAdministrador','admin externo','admin','supervisor'],
    ['superAdministrador','administrador externo']
  ),
  reportePorEmpleado
);

// Sólo roles supAdministrador, admin externo, admin o supervisor
// o perfiles superAdministrador, administrador externo
router.post('/reportes', verifyToken, authorizeRolesOrProfiles(
    ['supAdministrador', 'admin externo', 'admin', 'supervisor'],
    ['superAdministrador', 'administrador externo']
),
    crearReporte
)

// Sólo roles supAdministrador o admin externo
// o perfiles superAdministrador, administrador externo
router.put('/reportes/:id', verifyToken, authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
),
    editarReporte
)

// Sólo roles supAdministrador o admin externo
// o perfiles superAdministrador, administrador externo
router.delete('/reportes/:id', verifyToken, authorizeRolesOrProfiles(
    ['supAdministrador',],
    ['superAdministrador']
),
    eliminarReporte
)

export default router