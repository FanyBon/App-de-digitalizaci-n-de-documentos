import { getConnection } from '../../config/db_controlcomidas';

export interface FamiliaProductoInterface {
  id?: number;
  nombre: string;
  descripcion: string;
  parent_id?: number; // Referencia a una familia padre (opcional)
  empresa_id: number;
  created_at?: Date;
  updated_at?: Date;
}

export class FamiliaProducto {
  // Listar todas las familias de productos
  static async listar(): Promise<FamiliaProductoInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM familias_productos');
      return rows;
    } catch (error) {
      console.error('Error al listar familias de productos:', error);
      throw new Error('Error al listar familias de productos');
    }
  }

  // Obtener una familia de productos por ID
  static async obtenerPorId(id: number): Promise<FamiliaProductoInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM familias_productos WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener familia de productos:', error);
      throw new Error('Error al obtener familia de productos');
    }
  }

  // Crear una nueva familia de productos
  static async crear(familia: FamiliaProductoInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `INSERT INTO familias_productos (nombre, descripcion, parent_id, empresa_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [familia.nombre, familia.descripcion, familia.parent_id, familia.empresa_id]
      );
      return {
        success: true,
        data: { id: result.insertId, ...familia, created_at: new Date(), updated_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear familia de productos:', error);
      return { success: false, error: 'Error al crear la familia de productos' };
    }
  }

  // Editar una familia de productos
  static async editar(
    id: number,
    data: Partial<FamiliaProductoInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`UPDATE familias_productos SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Familia de productos no encontrada' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar familia de productos:', error);
      return { success: false, error: 'Error al editar la familia de productos' };
    }
  }

  // Eliminar una familia de productos
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM familias_productos WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Familia de productos no encontrada' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar familia de productos:', error);
      return { success: false, error: 'Error al eliminar la familia de productos' };
    }
  }
}
