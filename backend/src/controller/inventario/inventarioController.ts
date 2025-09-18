import { Request, Response, NextFunction } from 'express';
import { InventarioArticulo } from '../../models/inventario/InventarioArticulo';
import { MovimientoInventario } from '../../models/inventario/MovimientoInventario';
import { getConnection } from '../../config/db_controlcomidas';

// CRUD para Artículos de Inventario

export const listarArticulos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const articulos = await InventarioArticulo.listar();
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error en listar artículos:', error);
    next(error);
  }
};

export const crearArticulo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { nombre, categoria, tipo_articulo, descripcion, stock_total, stock_disponible, empresa_id, usuario_id } = req.body;
    if (!nombre || !categoria || !tipo_articulo || !empresa_id || !usuario_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios para crear el artículo' });
      return;
    }
    const articulo = await InventarioArticulo.crear({ nombre, categoria, tipo_articulo, descripcion, stock_total, stock_disponible, empresa_id, usuario_id });
    res.status(201).json(articulo);
  } catch (error) {
    console.error('Error en crear artículo:', error);
    next(error);
  }
};

export const editarArticulo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!id) {
      res.status(400).json({ error: 'ID del artículo es obligatorio' });
      return;
    }
    const articulo = await InventarioArticulo.editar(Number(id), data);
    res.status(200).json({ message: 'Artículo actualizado correctamente', data: articulo });
  } catch (error) {
    console.error('Error en editar artículo:', error);
    next(error);
  }
};

export const eliminarArticulo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'ID del artículo es obligatorio' });
      return;
    }
    const resp = await InventarioArticulo.eliminar(Number(id));
    res.status(200).json(resp);
  } catch (error) {
    console.error('Error en eliminar artículo:', error);
    next(error);
  }
};

// CRUD para Movimientos de Inventario

export const listarMovimientos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const movimientos = await MovimientoInventario.listar();
    res.status(200).json(movimientos);
  } catch (error) {
    console.error('Error en listar movimientos:', error);
    next(error);
  }
};

export const registrarMovimiento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id } = req.body;
    if (!articulo_id || !fecha || !tipo_movimiento || !cantidad || !usuario_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios para registrar movimiento' });
      return;
    }
    const movimiento = await MovimientoInventario.registrar({ articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id });
    res.status(201).json(movimiento);
  } catch (error) {
    console.error('Error en registrar movimiento:', error);
    next(error);
  }
};

export const editarMovimiento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  // Extraemos los datos del body
  const { articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id } = req.body;

  // Validaciones iniciales
  if (!id) {
    res.status(400).json({ error: 'ID del movimiento es obligatorio.' });
    return;
  }

  // Obtenemos el pool, luego una conexión individual
  const connection = await getConnection();



  try {
    await connection.beginTransaction();

    // Verificar si el movimiento existe y obtenerlo
    const [movimientoExistente]: any = await connection.query(
      `SELECT * FROM movimientos_inventario WHERE id = ?`, [id]
    );

    if (movimientoExistente.length === 0) {
      throw new Error('Movimiento no encontrado.');
    }

    // Declarar movimientoActual para usarlo en la actualización
    const movimientoActual = movimientoExistente[0];

    // Si se envía un cambio en la cantidad, realizar validaciones y ajustes en el stock
    if (cantidad !== undefined) {
      if (cantidad <= 0) {
        throw new Error('La cantidad debe ser un número positivo.');
      }

      if (tipo_movimiento === 'traslado' || tipo_movimiento === 'salida') {
        const [stockOrigen]: any = await connection.query(
          `SELECT stock_disponible FROM inventario_articulos WHERE id = ? AND empresa_id = ?`,
          [articulo_id, origen_id]
        );
        const stockDisponible = stockOrigen[0]?.stock_disponible || 0;
        if (cantidad > stockDisponible) {
          throw new Error('Stock insuficiente en la ubicación de origen.');
        }
        // Ajustar stock en origen
        await connection.query(
          `UPDATE inventario_articulos 
           SET stock_total = stock_total - ?, stock_disponible = stock_disponible - ?
           WHERE id = ? AND empresa_id = ?`,
          [cantidad, cantidad, articulo_id, origen_id]
        );
      }

      if (tipo_movimiento === 'traslado' || tipo_movimiento === 'entrada') {
        // Ajustar stock en destino
        await connection.query(
          `UPDATE inventario_articulos 
           SET stock_total = stock_total + ?, stock_disponible = stock_disponible + ?
           WHERE id = ? AND empresa_id = ?`,
          [cantidad, cantidad, articulo_id, destino_id]
        );
      }
    }

    // Actualizar el movimiento con los nuevos datos, usando valores actuales si no se actualizan
    await connection.query(
      `UPDATE movimientos_inventario SET 
         articulo_id = ?, 
         fecha = ?, 
         tipo_movimiento = ?, 
         cantidad = ?, 
         origen_id = ?, 
         destino_id = ?, 
         motivo = ?, 
         usuario_id = ?
       WHERE id = ?`,
      [
        articulo_id || movimientoActual.articulo_id,
        fecha || movimientoActual.fecha,
        tipo_movimiento || movimientoActual.tipo_movimiento,
        cantidad !== undefined ? cantidad : movimientoActual.cantidad,
        origen_id || movimientoActual.origen_id,
        destino_id || movimientoActual.destino_id,
        motivo || movimientoActual.motivo,
        usuario_id || movimientoActual.usuario_id,
        id
      ]
    );

    await connection.commit();
    res.status(200).json({ message: 'Movimiento actualizado correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error en editar movimiento:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    connection.release();
  }
};


// Eliminar un movimiento de inventario
export const eliminarMovimiento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'ID del movimiento es obligatorio' });
    return;
  }
  
  // Obtenemos el pool y luego una conexión individual
  const connection = await getConnection();


  try {
    await connection.beginTransaction();
    
    // Verificamos si el movimiento existe
    const [movimientoExistente]: any = await connection.query(
      `SELECT * FROM movimientos_inventario WHERE id = ?`, [id]
    );
    if (movimientoExistente.length === 0) {
      throw new Error('Movimiento no encontrado.');
    }

    // Eliminamos el movimiento
    await connection.query(`DELETE FROM movimientos_inventario WHERE id = ?`, [id]);
    await connection.commit();
    
    res.status(200).json({ message: 'Movimiento eliminado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error en eliminar movimiento:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    connection.release();
  }
};

export const moverInventario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id } = req.body;

  // Valida los campos obligatorios
  if (!articulo_id || !fecha || !tipo_movimiento || !cantidad || !usuario_id) {
    res.status(400).json({ error: 'Faltan campos obligatorios.' });
    return;
  }
  if (cantidad <= 0) {
    res.status(400).json({ error: 'La cantidad debe ser un número positivo.' });
    return;
  }
  if ((tipo_movimiento === 'traslado' || tipo_movimiento === 'salida') && !origen_id) {
    res.status(400).json({ error: 'La ubicación de origen es obligatoria para este movimiento.' });
    return;
  }
  if ((tipo_movimiento === 'traslado' || tipo_movimiento === 'entrada') && !destino_id) {
    res.status(400).json({ error: 'La ubicación de destino es obligatoria para este movimiento.' });
    return;
  }

  // Obtenemos el pool y luego una conexión individual
  const connection = await getConnection();


  try {
    await connection.beginTransaction();

    // Validar stock en la ubicación de origen (si aplica)
    if (tipo_movimiento === 'traslado' || tipo_movimiento === 'salida') {
      const [origenRows]: any = await connection.query(
        `SELECT stock_disponible FROM inventario_articulos WHERE id = ? AND empresa_id = ?`,
        [articulo_id, origen_id]
      );
      const stockDisponible = origenRows[0]?.stock_disponible || 0;
      if (cantidad > stockDisponible) {
        throw new Error('Stock insuficiente en la ubicación de origen');
      }
      // Actualizar registro de origen: descontar
      await connection.query(
        `UPDATE inventario_articulos
         SET stock_total = stock_total - ?, stock_disponible = stock_disponible - ?
         WHERE id = ? AND empresa_id = ?`,
         [cantidad, cantidad, articulo_id, origen_id]
      );
    }

    // Actualizar la ubicación de destino:
    // Primero, verificamos si ya existe un registro para ese artículo en la ubicación destino.
    const [destRows]: any = await connection.query(
      `SELECT * FROM inventario_articulos WHERE id = ? AND empresa_id = ?`,
      [articulo_id, destino_id]
    );
    if (destRows.length === 0) {
      // No existe la fila: la creamos.
      // Obtenemos los datos base del artículo de la ubicación origen.
      const [origenDatos]: any = await connection.query(
        `SELECT nombre, categoria, tipo_articulo, descripcion FROM inventario_articulos WHERE id = ? AND empresa_id = ?`,
        [articulo_id, origen_id]
      );
      if (origenDatos.length === 0) {
        throw new Error('No se encontró el registro base en la ubicación de origen para duplicar.');
      }
      const baseArticulo = origenDatos[0];
      await connection.query(
        `INSERT INTO inventario_articulos 
         (nombre, categoria, tipo_articulo, descripcion, stock_total, stock_disponible, empresa_id, usuario_id, sincronizado, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
         [baseArticulo.nombre, baseArticulo.categoria, baseArticulo.tipo_articulo, baseArticulo.descripcion, cantidad, cantidad, destino_id, usuario_id]
      );
    } else {
      // Si ya existe, actualizamos sumando el stock.
      await connection.query(
        `UPDATE inventario_articulos
         SET stock_total = stock_total + ?, stock_disponible = stock_disponible + ?
         WHERE id = ? AND empresa_id = ?`,
         [cantidad, cantidad, articulo_id, destino_id]
      );
    }

    // Registrar el movimiento en la tabla de movimientos_inventario
    await connection.query(
      `INSERT INTO movimientos_inventario 
         (articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [articulo_id, fecha, tipo_movimiento, cantidad, origen_id || null, destino_id || null, motivo || '', usuario_id]
    );

    await connection.commit();
    res.status(200).json({ message: 'Movimiento realizado exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al mover inventario:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    connection.release();
  }
};
