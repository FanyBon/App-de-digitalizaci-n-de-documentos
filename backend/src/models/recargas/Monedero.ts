import { getConnection } from '../../config/db_controlcomidas';

export interface MonederoInterface {
  id?: number;
  empleado_id: number;
  saldo_actual: number;
  fecha_creacion?: Date;
  activo: number; // Podrías convertirlo a boolean, pero en la BD es tinyint(1)
}

export class Monedero {
  
  // Listar todos los monederos
  static async listar(): Promise<MonederoInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM monederos');
      return rows;
    } catch (error) {
      console.error('Error al listar monederos:', error);
      throw new Error('Error al listar monederos');
    }
  }

  // Obtener un monedero por su ID
  static async obtenerPorId(id: number): Promise<MonederoInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM monederos WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener monedero:', error);
      throw new Error('Error al obtener monedero');
    }
  }

  static async obtenerSaldoPorCodigo(
    codigo: string
  ): Promise<{ empleado_id: number; saldo_actual: number } | null> {
    const conn = await getConnection();
    const [rows]: any = await conn.query(
      `SELECT m.empleado_id, m.saldo_actual
         FROM monederos m
         JOIN empleados e
           ON m.empleado_id = e.id
        WHERE e.codigo_barras = ?
          AND m.activo = 1
        LIMIT 1`,
      [codigo]
    );
    return rows[0] || null;
  }

  static async obtenerSaldoPorQR(
    codigoQR: string
  ): Promise<{ empleado_id: number; saldo_actual: number } | null> {
    const conn = await getConnection();
    const [rows]: any = await conn.query(
      `SELECT 
         m.empleado_id,
         m.saldo_actual
       FROM monederos m
       JOIN empleados e
         ON m.empleado_id = e.id
      WHERE e.codigo_qr = ?
        AND m.activo = 1
      LIMIT 1`,
      [codigoQR]
    );
    return rows[0] || null;
  }

  // Crear un nuevo monedero
  static async crear(monedero: MonederoInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `INSERT INTO monederos (empleado_id, saldo_actual, fecha_creacion, activo) VALUES (?, ?, NOW(), ?)`,
        [monedero.empleado_id, monedero.saldo_actual, monedero.activo]
      );
      return {
        success: true,
        data: {
          id: result.insertId,
          ...monedero,
          fecha_creacion: new Date() // asumiendo que se crea en el momento
        }
      };
    } catch (error: any) {
      console.error('Error al crear monedero:', error);
      return { success: false, error: 'Error al crear el monedero' };
    }
  }

  // Editar un monedero
  static async editar(id: number, data: Partial<MonederoInterface>): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `UPDATE monederos SET ? WHERE id = ?`,
        [data, id]
      );
      if (result.affectedRows === 0) {
        return { success: false, error: 'Monedero no encontrado' };
      }
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar monedero:', error);
      return { success: false, error: 'Error al editar el monedero' };
    }
  }

  // Eliminar un monedero
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `DELETE FROM monederos WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) {
        return { success: false, error: 'Monedero no encontrado' };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar monedero:', error);
      return { success: false, error: 'Error al eliminar el monedero' };
    }
  }
}
