import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../../config/db_controlcomidas';
import { Transaccion } from '../../models/ventas/Transacciones';

export const procesarTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const MAX_RETRIES = 3;
  let attempts = 0;
  let conn: any;

  // Obtenemos los datos enviados en el body
  const { saleData, details } = req.body;

  if (!saleData || !details || !Array.isArray(details)) {
    res.status(400).json({ error: "Datos de venta incompletos. Debe incluir saleData y details." });
    return;
  }

  // Generar la referencia automáticamente en base al método del modelo.
  const referenciaGenerada = Transaccion.generarReferencia();

  while (attempts < MAX_RETRIES) {
    try {
      conn = await getConnection();
      await conn.beginTransaction();

      // 1. Insertar la venta en la tabla ventas_pdv
      const [saleResult]: any = await conn.query(
        `INSERT INTO ventas_pdv 
           (fecha_hora, empleado_id, usuario_id, total_venta, subsidio_aplicado, tipo_venta, monedero_id, metodo_pago_id, created_at, referencia)
         VALUES 
           (NOW(), ?, ?, ?, ?, ?, ?,?, NOW(), ?)`,
        [
          saleData.empleado_id,
          saleData.usuario_id,
          saleData.total_venta,
          saleData.subsidio_aplicado,
          saleData.tipo_venta,
          saleData.monedero_id,
          saleData.metodo_pago_id,   // Aquí se pasa el método de pago
          referenciaGenerada
        ]
      );
      const ventaId = saleResult.insertId;

      // 2. Insertar cada detalle de venta en la tabla detalle_venta
      for (const item of details) {
        await conn.query(
          `INSERT INTO detalle_venta 
     (venta_id, producto_id, cantidad, precio_unitario, subsidio_aplicado, metodo_pago_id)
   VALUES 
     (?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            item.producto_id,
            item.cantidad,
            item.precio_unitario,
            item.subsidio_aplicado,
            saleData.metodo_pago_id  // Utilizamos el método de pago de la venta (o, si cada detalle tuviera su método específico, podrías usar item.metodo_pago_id)
          ]
        );

        // 3. Si se aplicó subsidio en este detalle, registrarlo en subsidios_utilizados
        if (Number(item.subsidio_aplicado) > 0) {
          await conn.query(
            `INSERT INTO subsidios_utilizados 
               (empleado_id, fecha, monto_subsidio, created_at, venta_id, producto_id)
             VALUES 
               (?, CURDATE(), ?, NOW(), ?, ?)`,
            [saleData.empleado_id, item.subsidio_aplicado, ventaId, item.producto_id]
          );
        }
      }

      // 4. Actualizar el saldo del monedero: se descuenta el total de venta (en este caso, el neto a pagar)
      await conn.query(
        `UPDATE monederos 
         SET saldo_actual = saldo_actual - ? 
         WHERE id = ?`,
        [saleData.total_venta, saleData.monedero_id]
      );

      //Validar si existe el # de referencia

      // Confirmar la transacción
      await conn.commit();

      res.status(201).json({
        message: "Transacción procesada exitosamente",
        venta_id: ventaId
      });
      return;  // Finaliza la función si la transacción fue exitosa

    } catch (error) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackError) {
          console.error("Error al realizar rollback:", rollbackError);
        }
      }
      // Reintentar si se detecta deadlock y aún no se han superado los reintentos.
      // Se utiliza la aserción (error as any) para acceder a .code.
      // Reintentar si se detecta deadlock y aún no se han superado los reintentos.
      // Se utiliza la aserción (error as any) para acceder a .code.
      if ((error as any).code === 'ER_LOCK_DEADLOCK' && attempts < MAX_RETRIES - 1) {
        attempts++;
        console.warn(`Deadlock detectado. Reintentando transacción (${attempts} de ${MAX_RETRIES})...`);
        // Back-off simple: esperar (100ms * intentos) antes de reintentar
        await new Promise(resolve => setTimeout(resolve, attempts * 100));
      } else {
        console.error('Error en procesarTransaccion:', error);
        res.status(500).json({ error: "Error al procesar la transacción" });
        return;
      }
    } finally {
      if (conn) conn.release();
    }
  }
  // Si se superaron los reintentos sin éxito, se retorna error.
  res.status(500).json({ error: "No se pudo procesar la transacción debido a conflictos en la base de datos. Por favor, inténtelo nuevamente." });
};

// Listar transacciones
export const listarTransacciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transacciones = await Transaccion.listar();
    res.status(200).json(transacciones);
  } catch (error) {
    console.error('Error en listarTransacciones:', error);
    next(error);
  }
};

// Obtener transacción por ID
export const obtenerTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const transaccion = await Transaccion.obtenerPorId(Number(id));
    if (!transaccion) {
      res.status(404).json({ error: 'Transacción no encontrada' });
      return;
    }
    res.status(200).json(transaccion);
  } catch (error) {
    console.error('Error en obtenerTransaccion:', error);
    next(error);
  }
};

// Buscar transacciones por referencia, empleado o fecha
export const buscarTransacciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === "") {
      res.status(400).json({ error: "El parámetro 'q' es obligatorio y debe ser un string válido" });
      return;
    }
    const transacciones = await Transaccion.buscar(q);
    if (transacciones.length === 0) {
      res.status(404).json({ message: "No se encontraron transacciones con el término proporcionado" });
      return;
    }
    res.status(200).json(transacciones);
  } catch (error) {
    console.error("Error en buscarTransacciones:", error);
    next(error);
  }
};

// Editar una transacción
export const editarTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Transaccion.editar(Number(req.params.id), req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error en editarTransaccion:', error);
    next(error);
  }
};

// Eliminar una transacción
export const eliminarTransaccion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Transaccion.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarTransaccion:', error);
    next(error);
  }
};
