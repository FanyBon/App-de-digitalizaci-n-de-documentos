import { Router } from 'express';
import { login } from '../controller/authController';

const router = Router();

// Ruta para login
router.post('/login', login);

export default router;