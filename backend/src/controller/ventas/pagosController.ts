// src/controller/ventas/pagosController.ts

import { Request, Response, NextFunction } from 'express';
import { getPool } from '../../config/db_controlcomidas';
import { Transaccion } from '../../models/ventas/Transacciones';

export const procesarPagoNormal = async (
  req: Request,        // Request ya incluye user?: AuthPayload
  res: Response,
  next: NextFunction
): Promise<void> => {
  let conn;
  try {
    conn = await getPool().getConnection();
    await conn.beginTransaction();

    const { saleData, details } = req.body;
    if (!saleData || !details || !Array.isArray(details)) {
      res
        .status(400)
        .json({ error: 'Datos de venta incompletos. Debe incluir saleData y details.' });
      return;
    }

    // Non-null assertion tras verifyToken
    const usuarioId = req.user!.id;
    const DEFAULT_EMP = 50;
    const empleado_id = DEFAULT_EMP;

    if (!saleData.metodo_pago_id) {
      res
        .status(400)
        .json({ error: "Para venta normal se requiere 'metodo_pago_id'." });
      return;
    }
    const metodo_pago_id = Number(saleData.metodo_pago_id);

let referencia = `${Transaccion.generarReferenciaNumerica()}-MP${metodo_pago_id}`;

    const [saleResult]: any = await conn.query(
      `INSERT INTO ventas_pdv
         (fecha_hora, empleado_id, usuario_id, total_venta, subsidio_aplicado,
          tipo_venta, monedero_id, metodo_pago_id, created_at, referencia)
       VALUES (NOW(), ?, ?, ?, ?, ?, 26, ?, NOW(), ?)`,
      [
        empleado_id,
        saleData.usuario_id,
        saleData.total_venta,
        saleData.subsidio_aplicado,
        saleData.tipo_venta,
        metodo_pago_id,
        referencia,
      ]
    );
    const ventaId = saleResult.insertId;

    for (const item of details) {
      await conn.query(
        `INSERT INTO detalle_venta
           (venta_id, producto_id, cantidad, precio_unitario, subsidio_aplicado, metodo_pago_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.subsidio_aplicado,
          metodo_pago_id,
        ]
      );

      if (Number(item.subsidio_aplicado) > 0) {
        await conn.query(
          `INSERT INTO subsidios_utilizados
             (empleado_id, fecha, monto_subsidio, created_at, venta_id, producto_id)
           VALUES (?, CURDATE(), ?, NOW(), ?, ?)`,
          [empleado_id, item.subsidio_aplicado, ventaId, item.producto_id]
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      message: 'Pago normal procesado exitosamente',
      venta_id: ventaId,
      referencia,
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
    console.error('Error en procesarPagoNormal:', error);
    res.status(500).json({ error: 'Error al procesar el pago normal' });
  } finally {
    if (conn) conn.release();
  }
};

export const listarVentasNormales = async (
  req: Request,     // aquí también Request estándar
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const conn = await getPool().getConnection();
    const DEFAULT_EMP_ID = 50;
    const DEFAULT_MONEDERO_ID = 26;

    const [rows]: any = await conn.query(
      `SELECT id, fecha_hora, empleado_id, usuario_id, total_venta,
              subsidio_aplicado, tipo_venta, monedero_id, metodo_pago_id,
              created_at, referencia
       FROM ventas_pdv
       WHERE empleado_id = ? AND monedero_id = ?`,
      [DEFAULT_EMP_ID, DEFAULT_MONEDERO_ID]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error en listarVentasNormales:', error);
    next(error);
  }
};
