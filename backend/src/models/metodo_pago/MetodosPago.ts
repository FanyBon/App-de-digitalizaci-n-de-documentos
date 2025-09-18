// src/models/MetodosPago.ts
import { getConnection } from '../../config/db_controlcomidas';

export interface MetodoPagoInterface {
  id?: number;
  nombre: string;
  codigo: string;
  comision: number;
  requiere_validacion: number; // Se usa 0/1 (puedes tratarlo como booleano en la lógica)
  activo: number;              // 0/1 para indicar si está activo
  empresa_id: number;
  created_at?: Date;
  updated_at?: Date;
}

export class MetodoPago {
  // Listar todos los métodos de pago
  static async listar(): Promise<MetodoPagoInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM metodos_pago');
      return rows;
    } catch (error) {
      console.error('Error al listar métodos de pago:', error);
      throw new Error('Error al listar métodos de pago');
    }
  }

  // Obtener un método de pago por ID
  static async obtenerPorId(id: number): Promise<MetodoPagoInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM metodos_pago WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener método de pago:', error);
      throw new Error('Error al obtener método de pago');
    }
  }

  // Crear un nuevo método de pago
  static async crear(metodo: MetodoPagoInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `INSERT INTO metodos_pago (nombre, codigo, comision, requiere_validacion, activo, empresa_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [metodo.nombre, metodo.codigo, metodo.comision, metodo.requiere_validacion, metodo.activo, metodo.empresa_id]
      );
      return {
        success: true,
        data: { id: result.insertId, ...metodo, created_at: new Date(), updated_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear método de pago:', error);
      return { success: false, error: 'Error al crear el método de pago' };
    }
  }

  // Editar un método de pago
  static async editar(
    id: number,
    data: Partial<MetodoPagoInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`UPDATE metodos_pago SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Método de pago no encontrado' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar método de pago:', error);
      return { success: false, error: 'Error al editar el método de pago' };
    }
  }

  // Eliminar un método de pago
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM metodos_pago WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Método de pago no encontrado' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar método de pago:', error);
      return { success: false, error: 'Error al eliminar el método de pago' };
    }
  }
}
