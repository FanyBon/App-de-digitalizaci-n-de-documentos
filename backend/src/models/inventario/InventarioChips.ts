import { getConnection } from '../../config/db_controlcomidas';

export class InventarioChips {
  // Lista todos los registros de detalles de chips
  static async listar(): Promise<any[]> {
    const conn = await getConnection('local');
    try {
      const [rows]: any = await conn.query('SELECT * FROM inventario_chips');
      return rows;
    } catch (error) {
      console.error('Error al listar detalles de chips:', error);
      throw error;
    }
  }

  // Crea un nuevo registro de detalles para un chip
  static async crear(data: {
    inventario_id: number;
    numero_telefono: string;
    compania: string;
    fecha_actualizacion_plan: string;  // Puede ser en formato 'YYYY-MM-DD'
    ubicacion_actual: 'comedor' | 'resguardo';
  }): Promise<any> {
    const conn = await getConnection('local');
    try {
      const { inventario_id, numero_telefono, compania, fecha_actualizacion_plan, ubicacion_actual } = data;
      const [result]: any = await conn.query(
        `INSERT INTO inventario_chips (inventario_id, numero_telefono, compania, fecha_actualizacion_plan, ubicacion_actual)
         VALUES (?, ?, ?, ?, ?)`,
        [inventario_id, numero_telefono, compania, fecha_actualizacion_plan, ubicacion_actual]
      );
      return { id: result.insertId, ...data };
    } catch (error) {
      console.error('Error al crear detalles de chip:', error);
      throw error;
    }
  }

  // Edita los detalles de un chip
  static async editar(id: number, data: {
    inventario_id?: number;
    numero_telefono?: string;
    compania?: string;
    fecha_actualizacion_plan?: string;
    ubicacion_actual?: 'comedor' | 'resguardo';
  }): Promise<any> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        `UPDATE inventario_chips SET ? WHERE id = ?`,
        [data, id]
      );
      if (result.affectedRows === 0) {
        throw new Error('Detalles del chip no encontrados');
      }
      return { id, ...data };
    } catch (error) {
      console.error('Error al editar detalles de chip:', error);
      throw error;
    }
  }

  // Elimina un registro de detalles de chip
  static async eliminar(id: number): Promise<any> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        `DELETE FROM inventario_chips WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) {
        throw new Error('Detalles del chip no encontrados');
      }
      return { message: 'Detalles del chip eliminados correctamente' };
    } catch (error) {
      console.error('Error al eliminar detalles de chip:', error);
      throw error;
    }
  }
}
