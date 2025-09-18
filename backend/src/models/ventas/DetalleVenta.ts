import { getConnection } from '../../config/db_controlcomidas';

export interface DetalleVentaInterface {
  id?: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subsidio_aplicado: number;
  metodo_pago_id: number; // Nuevo campo
  created_at?: Date;
}

export class DetalleVenta {
  // Listar todos los detalles de venta
  static async listar(): Promise<DetalleVentaInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM detalle_venta');
      return rows;
    } catch (error) {
      console.error('Error al listar detalles de venta:', error);
      throw new Error('Error al listar detalles de venta');
    }
  }

  // Obtener un detalle de venta por ID
  static async obtenerPorId(id: number): Promise<DetalleVentaInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM detalle_venta WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener detalle de venta:', error);
      throw new Error('Error al obtener detalle de venta');
    }
  }

  // Crear un nuevo detalle de venta
  static async crear(detalleVenta: DetalleVentaInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subsidio_aplicado, metodo_pago_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          detalleVenta.venta_id,
          detalleVenta.producto_id,
          detalleVenta.cantidad,
          detalleVenta.precio_unitario,
          detalleVenta.subsidio_aplicado,
          detalleVenta.metodo_pago_id  // Se incluye el método de pago
        ]
      );

      return {
        success: true,
        data: { id: result.insertId, ...detalleVenta, created_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear detalle de venta:', error);
      return { success: false, error: 'Error al crear el detalle de venta' };
    }
  }

  // Editar un detalle de venta
  static async editar(id: number, data: Partial<DetalleVentaInterface>): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`UPDATE detalle_venta SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Detalle de venta no encontrado' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar detalle de venta:', error);
      return { success: false, error: 'Error al editar el detalle de venta' };
    }
  }

  // Eliminar un detalle de venta
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM detalle_venta WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Detalle de venta no encontrado' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar detalle de venta:', error);
      return { success: false, error: 'Error al eliminar el detalle de venta' };
    }
  }
}
