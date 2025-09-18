import { getConnection } from '../../config/db_controlcomidas';

export class MovimientoInventario {

  // Listar todos los movimientos
  static async listar(): Promise<any[]> {
    const conn = await getConnection('local');
    try {
      const [rows]: any = await conn.query('SELECT * FROM movimientos_inventario');
      return rows;
    } catch (error) {
      console.error('Error al listar movimientos:', error);
      throw error;
    }
  }

  // Registra un movimiento de inventario
  static async registrar(data: {
    articulo_id: number;
    fecha: string;
    tipo_movimiento: string;
    cantidad: number;
    origen_id?: number;
    destino_id?: number;
    motivo?: string;
    usuario_id: number;
  }): Promise<any> {
    const conn = await getConnection('local');
    try {
      const { articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id } = data;
      const [result]: any = await conn.query(
        `INSERT INTO movimientos_inventario 
         (articulo_id, fecha, tipo_movimiento, cantidad, origen_id, destino_id, motivo, usuario_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
         [articulo_id, fecha, tipo_movimiento, cantidad, origen_id || null, destino_id || null, motivo || '', usuario_id]
      );
      return { id: result.insertId, ...data };
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      throw error;
    }
  }

  // Editar un movimiento
  static async editar(id: number, data: {
    articulo_id?: number;
    fecha?: string;
    tipo_movimiento?: string;
    cantidad?: number;
    origen_id?: number;
    destino_id?: number;
    motivo?: string;
    usuario_id?: number;
  }): Promise<any> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        `UPDATE movimientos_inventario SET ? WHERE id = ?`,
        [data, id]
      );
      if (result.affectedRows === 0) {
        throw new Error('Movimiento no encontrado');
      }
      return { id, ...data };
    } catch (error) {
      console.error('Error al editar movimiento:', error);
      throw error;
    }
  }

  // Eliminar un movimiento
  static async eliminar(id: number): Promise<any> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        `DELETE FROM movimientos_inventario WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) {
        throw new Error('Movimiento no encontrado');
      }
      return { message: 'Movimiento eliminado correctamente' };
    } catch (error) {
      console.error('Error al eliminar movimiento:', error);
      throw error;
    }
  }
}
