import { Router } from 'express';
import { 
  listarArticulos, 
  crearArticulo, 
  editarArticulo, 
  eliminarArticulo, 
  listarMovimientos,
  editarMovimiento,
  eliminarMovimiento,
  moverInventario  
} from '../../controller/inventario/inventarioController';

const router = Router();

// Rutas para CRUD de Artículos de Inventario
router.get('/inventario', listarArticulos);
router.post('/inventario', crearArticulo);
router.put('/inventario/:id', editarArticulo);
router.delete('/inventario/:id', eliminarArticulo);

// Rutas para CRUD de Movimientos de Inventario
router.get('/inventario/movimientos', listarMovimientos);
router.put('/inventario/movimientos/:id', editarMovimiento);
router.delete('/inventario/movimientos/:id', eliminarMovimiento);
// Nueva ruta para mover inventario (traslado, entrada/salida transaccional)
router.post('/inventario/mover', moverInventario);

export default router;