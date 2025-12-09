import { getPool, getConnection } from '../../config/db_controlcomidas';
import { PoolConnection } from 'mysql2/promise';

export interface TransaccionInterface {
  id?: number;
  fecha_hora?: Date;
  empleado_id: number;
  usuario_id: number;
  total_venta: number;
  subsidio_aplicado: number;
  tipo_venta: 'pdv' | 'comedor' | 'mixto';
  monedero_id: number;
  metodo_pago_id: number;
  referencia?: string;
  created_at?: Date;
}

export class Transaccion {
  // Generar referencia única de venta
  static generarReferenciaNumerica(): string {
    const d = new Date();
    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const ms = pad(d.getMilliseconds(), 3);
    return `${yyyy}${MM}${dd}${hh}${mm}${ss}${ms}`;
  }

  // Listar todas las transacciones (query simple: usar pool directo)
  static async listar(): Promise<TransaccionInterface[]> {
    try {
      const pool = getPool('local');
      const [rows] = await pool.query<any[]>('SELECT * FROM ventas_pdv');
      return rows;
    } catch (error) {
      console.error('Error al listar transacciones:', error);
      throw new Error('Error al listar transacciones');
    }
  }

  // Obtener transacción por ID
  static async obtenerPorId(id: number): Promise<TransaccionInterface | null> {
    try {
      const pool = getPool('local');
      const [rows] = await pool.query<any[]>(
        'SELECT * FROM ventas_pdv WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error al obtener transacción:', error);
      throw new Error('Error al obtener transacción');
    }
  }

  // Buscar transacciones por referencia, empleado o fecha
  static async buscar(query: string): Promise<TransaccionInterface[]> {
    try {
      const pool = getPool('local');
      const likeQuery = `%${query}%`;
      const [rows] = await pool.query<any[]>(
        `SELECT * FROM ventas_pdv 
         WHERE referencia LIKE ? 
            OR empleado_id LIKE ? 
            OR DATE(fecha_hora) = ?`,
        [likeQuery, likeQuery, query]
      );
      return rows;
    } catch (error) {
      console.error('Error al buscar transacciones:', error);
      throw new Error('Error al buscar transacciones');
    }
  }

  // Editar transacción (usar conexión para consistencia)
  static async editar(
    id: number,
    data: Partial<TransaccionInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        'UPDATE ventas_pdv SET ? WHERE id = ?',
        [data, id]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'Transacción no encontrada' };
      }

      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar transacción:', error);
      return { success: false, error: error.message || 'Error al editar' };
    } finally {
      conn.release();
    }
  }

  // Eliminar transacción (usar conexión para consistencia)
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        'DELETE FROM ventas_pdv WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'Transacción no encontrada' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar transacción:', error);
      return { success: false, error: error.message || 'Error al eliminar' };
    } finally {
      conn.release();
    }
  }

  // Crear transacción completa con detalles (usar conexión con transacción DB)
  static async crear(
    ventaData: Omit<TransaccionInterface, 'id' | 'created_at'>,
    detalles: any[]
  ): Promise<{ success: boolean; venta_id?: number; error?: string }> {
    const conn = await getConnection('local');
    try {
      await conn.beginTransaction();

      // Insertar venta
      const [ventaResult]: any = await conn.query(
        `INSERT INTO ventas_pdv 
         (fecha_hora, empleado_id, usuario_id, total_venta, subsidio_aplicado,
          tipo_venta, monedero_id, metodo_pago_id, referencia, created_at)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          ventaData.empleado_id,
          ventaData.usuario_id,
          ventaData.total_venta,
          ventaData.subsidio_aplicado,
          ventaData.tipo_venta,
          ventaData.monedero_id,
          ventaData.metodo_pago_id,
          ventaData.referencia
        ]
      );

      const ventaId = ventaResult.insertId;

      // Insertar detalles
      for (const detalle of detalles) {
        await conn.query(
          `INSERT INTO detalle_venta 
           (venta_id, producto_id, cantidad, precio_unitario, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [ventaId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario]
        );
      }

      await conn.commit();
      return { success: true, venta_id: ventaId };
    } catch (error: any) {
      await conn.rollback();
      console.error('Error al crear transacción:', error);
      return { success: false, error: error.message || 'Error al crear' };
    } finally {
      conn.release();
    }
  }
}