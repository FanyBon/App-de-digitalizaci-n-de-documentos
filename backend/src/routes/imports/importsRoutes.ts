import { Router } from 'express';
import multer from 'multer';
import { importarEmpleados } from '../../controller/imports/empleadosImportController';

const upload = multer({ dest: 'uploads/' });
const router = Router();

// POST /api/imports/empleados
router.post('/empleados', upload.single('file'), importarEmpleados);

export default router;
