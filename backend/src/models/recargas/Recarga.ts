// src/models/Recarga.ts
import { getConnection } from '../../config/db_controlcomidas';

export interface RecargaInterface {
  id?: number;
  monedero_id: number;
  monto: number;
  fecha_recarga?: Date;
  metodo_pago_id: number;  // Nota: usamos metodo_pago_i
  usuario_id: number;
}

export class Recarga {
  // Listar todas las recargas
  static async listar(): Promise<RecargaInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM recargas');
      return rows;
    } catch (error) {
      console.error('Error al listar recargas:', error);
      throw new Error('Error al listar recargas');
    }
  }

  // Obtener una recarga por ID
  static async obtenerPorId(id: number): Promise<RecargaInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM recargas WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener recarga:', error);
      throw new Error('Error al obtener recarga');
    }
  }

  // Crear una nueva recarga y actualizar el saldo del monedero
  static async crear(recarga: RecargaInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      // Iniciamos la transacción
      await conn.beginTransaction();

      // 1. Insertar la recarga
      const [result]: any = await conn.query(
        `INSERT INTO recargas (monedero_id, monto, fecha_recarga, metodo_pago_id, usuario_id) 
         VALUES (?, ?, NOW(), ?, ?)`,
        [recarga.monedero_id, recarga.monto, recarga.metodo_pago_id, recarga.usuario_id]
      );

      // Validamos que se insertó la recarga
      if (!result.insertId) {
        throw new Error('Error al insertar recarga');
      }

      // 2. Actualizar el saldo del monedero sumando el monto de la recarga
      const [updateResult]: any = await conn.query(
        `UPDATE monederos SET saldo_actual = saldo_actual + ? WHERE id = ?`,
        [recarga.monto, recarga.monedero_id]
      );

      // Validamos que se actualizó el monedero
      if (updateResult.affectedRows === 0) {
        throw new Error('No se pudo actualizar el saldo del monedero');
      }

      // Confirmamos la transacción
      await conn.commit();

      return {
        success: true,
        data: { id: result.insertId, ...recarga, fecha_recarga: new Date() }
      };
    } catch (error: any) {
      // Si ocurre algún error, hacemos rollback
      await conn.rollback();
      console.error('Error al crear recarga y actualizar monedero:', error);
      return { success: false, error: 'Error al crear la recarga y actualizar el monedero' };
    }
  }

  // Editar una recarga existente
  static async editar(
    id: number,
    data: Partial<RecargaInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`UPDATE recargas SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Recarga no encontrada' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar recarga:', error);
      return { success: false, error: 'Error al editar la recarga' };
    }
  }

  // Eliminar una recarga
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM recargas WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Recarga no encontrada' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar recarga:', error);
      return { success: false, error: 'Error al eliminar la recarga' };
    }
  }
}
