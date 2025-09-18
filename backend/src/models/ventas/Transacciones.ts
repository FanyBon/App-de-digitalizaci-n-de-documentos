import { getConnection } from '../../config/db_controlcomidas';

export interface TransaccionInterface {
  id?: number;
  fecha_hora?: Date;
  empleado_id: number;
  usuario_id: number;
  total_venta: number;
  subsidio_aplicado: number;
  tipo_venta: 'pdv' | 'comedor' | 'mixto';
  monedero_id: number;
  metodo_pago_id: number;  // <-- Agregado
  referencia?: string;
  created_at?: Date;
}

export class Transaccion {
    // Método para generar una referencia de venta única
  static generarReferencia(): string {
    const timestamp = new Date().getTime(); // Obtiene el tiempo en milisegundos
    const randomNum = Math.floor(Math.random() * 10000); // Genera un número aleatorio
    return `VENTA-${timestamp}-${randomNum}`;
  }
  
  // Listar todas las transacciones
  static async listar(): Promise<TransaccionInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM ventas_pdv');
      return rows;
    } catch (error) {
      console.error('Error al listar transacciones:', error);
      throw new Error('Error al listar transacciones');
    }
  }

  // Obtener una transacción por ID
  static async obtenerPorId(id: number): Promise<TransaccionInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM ventas_pdv WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener transacción:', error);
      throw new Error('Error al obtener transacción');
    }
  }

  // Buscar transacciones por referencia, empleado o fecha
  static async buscar(query: string): Promise<TransaccionInterface[]> {
    const conn = await getConnection();
    try {
      const likeQuery = `%${query}%`;
      const [rows]: [any[], any] = await conn.query(
        `SELECT * FROM ventas_pdv WHERE referencia LIKE ? OR empleado_id LIKE ? OR DATE(fecha_hora) = ?`,
        [likeQuery, likeQuery, query]
      );
      return rows;
    } catch (error) {
      console.error('Error al buscar transacciones:', error);
      throw new Error('Error al buscar transacciones');
    }
  }

  // Editar una transacción
  static async editar(id: number, data: Partial<TransaccionInterface>): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`UPDATE ventas_pdv SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Transacción no encontrada' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar transacción:', error);
      return { success: false, error: 'Error al editar la transacción' };
    }
  }

  // Eliminar una transacción
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM ventas_pdv WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Transacción no encontrada' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar transacción:', error);
      return { success: false, error: 'Error al eliminar la transacción' };
    }
  }
}
