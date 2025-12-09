import { Router } from 'express';
import {
    listarAsistencias,
    crearAsistencia,
    editarAsistencia,
    eliminarAsistencia,
    registrarComida,
    listarAsistenciasPorRango    
} from '../../controller/reportes/asistenciasController';
import {
    verifyToken,
    authorizeRolesOrProfiles
} from '../../middewares/authMiddleware';

const router = Router();

// Roles y perfiles
const rolesBasicos = ['supAdministrador', 'admin externo', 'admin', 'supervisor', 'usuario'];
const perfilesBasicos = ['superAdministrador', 'administrador externo'];

// Todos los roles básicos o perfiles básicos pueden ver
router.get('/asistencias', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
    listarAsistencias
);

router.get(
  '/asistencias/rango',
  verifyToken,
  authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
  listarAsistenciasPorRango
);

// Todos los roles básicos o perfiles básicos pueden crear
router.post('/asistencias', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
    crearAsistencia
);

// Solo supAdministrador o perfil superAdministrador pueden editar
router.put('/asistencias/:id', verifyToken, authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
),
    editarAsistencia
);

// Solo supAdministrador o perfil superAdministrador pueden eliminar
router.delete('/asistencias/:id', verifyToken, authorizeRolesOrProfiles(
    ['supAdministrador'],
    ['superAdministrador']
),
    eliminarAsistencia
);

// Todos los roles básicos o perfiles básicos pueden registrar comida
router.post('/registrar-comida', verifyToken, authorizeRolesOrProfiles(rolesBasicos, perfilesBasicos),
    registrarComida
);

export default router;