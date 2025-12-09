import { getPool } from '../../config/db_controlcomidas';

export interface SubsidioUtilizadoInterface {
  id?: number;
  empleado_id: number;
  fecha: Date;
  monto_subsidio: number;
  venta_id: number;
  producto_id: number;
  created_at?: Date;
}

export class SubsidioUtilizado {
  // Listar todos los subsidios utilizados
  static async listar(): Promise<SubsidioUtilizadoInterface[]> {
    const conn = await getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM subsidios_utilizados');
      return rows;
    } catch (error) {
      console.error('Error al listar subsidios utilizados:', error);
      throw new Error('Error al listar subsidios utilizados');
    }
  }

  // Obtener un subsidio utilizado por ID
  static async obtenerPorId(id: number): Promise<SubsidioUtilizadoInterface | null> {
    const conn = await getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM subsidios_utilizados WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener subsidio utilizado:', error);
      throw new Error('Error al obtener subsidio utilizado');
    }
  }

  // Crear un nuevo subsidio utilizado
  static async crear(subsidioUtilizado: SubsidioUtilizadoInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');
    try {
      const [result]: any = await conn.query(
        `INSERT INTO subsidios_utilizados (empleado_id, fecha, monto_subsidio, venta_id, producto_id, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [subsidioUtilizado.empleado_id, subsidioUtilizado.fecha, subsidioUtilizado.monto_subsidio, subsidioUtilizado.venta_id, subsidioUtilizado.producto_id]
      );

      return {
        success: true,
        data: { id: result.insertId, ...subsidioUtilizado, created_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear subsidio utilizado:', error);
      return { success: false, error: 'Error al crear el subsidio utilizado' };
    }
  }

  // Editar un subsidio utilizado
  static async editar(id: number, data: Partial<SubsidioUtilizadoInterface>): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');
    try {
      const [result]: any = await conn.query(`UPDATE subsidios_utilizados SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Subsidio utilizado no encontrado' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar subsidio utilizado:', error);
      return { success: false, error: 'Error al editar el subsidio utilizado' };
    }
  }

  // Eliminar un subsidio utilizado
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getPool('local');
    try {
      const [result]: any = await conn.query(`DELETE FROM subsidios_utilizados WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Subsidio utilizado no encontrado' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar subsidio utilizado:', error);
      return { success: false, error: 'Error al eliminar el subsidio utilizado' };
    }
  }
}
