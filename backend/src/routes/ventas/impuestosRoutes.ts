import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listarImpuestos,
  obtenerImpuesto,
  crearImpuesto,
  actualizarImpuesto,
  eliminarImpuesto
} from '../../controller/ventas/impuestosController';

const router = Router();

router.get('/', listarImpuestos);

router.get(
  '/:id',
  [param('id').isInt({ gt: 0 }).withMessage('ID debe ser entero positivo')],
  obtenerImpuesto
);

router.post(
  '/',
  [
    body('nombre')
      .isString()
      .isLength({ min: 2 })
      .withMessage('Nombre mínimo 2 caracteres'),
    body('porcentaje')
      .isFloat({ min: 0 })
      .withMessage('Porcentaje debe ser número >= 0'),
    body('descripcion').optional().isString()
  ],
  crearImpuesto
);

router.put(
  '/:id',
  [
    param('id').isInt({ gt: 0 }),
    body('nombre')
      .optional()
      .isString()
      .isLength({ min: 2 }),
    body('porcentaje').optional().isFloat({ min: 0 }),
    body('descripcion').optional().isString()
  ],
  actualizarImpuesto
);

router.delete(
  '/:id',
  [param('id').isInt({ gt: 0 })],
  eliminarImpuesto
);

export default router;
