// src/routes/imports/empleadosImportRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { 
  importarEmpleados, 
  getHistorialImportaciones 
} from '../../controller/imports/empleadosImportController';
import { verifyToken } from '../../middewares/authMiddleware';
import { authorize } from '../../middewares/authorize';

const upload = multer({ dest: 'uploads/' });
const router = Router();

/**
 * POST /api/imports/empleados
 * Importar empleados desde archivo CSV
 * Requiere: empleados.importar
 */
router.post(
  '/empleados',
  verifyToken,
  authorize('empleados.importar'),
  upload.single('file'),
  importarEmpleados
);

/**
 * GET /api/imports/empleados/historial
 * Ver historial de importaciones
 * Requiere: empleados.ver_importaciones
 */
router.get(
  '/empleados/historial',
  verifyToken,
  authorize('empleados.ver_importaciones'),
  getHistorialImportaciones
);

export default router;