import { getConnection } from '../../config/db_controlcomidas';

export class InventarioArticulo {
  // Lista todos los artículos
  static async listar(): Promise<any[]> {
    const conn = await getConnection('local');
    try {
      const [rows]: any = await conn.query('SELECT * FROM inventario_articulos');
      return rows;
    } catch (error) {
      console.error('Error al listar artículos:', error);
      throw error;
    }
  }

  // Crea un nuevo artículo en inventario
  static async crear(data: {
    nombre: string;
    categoria: string;
    tipo_articulo: string;
    descripcion?: string;
    stock_total?: number;
    stock_disponible?: number;
    empresa_id: number;
    usuario_id: number;
  }): Promise<any> {
    const conn = await getConnection('local');
    try {
      const { nombre, categoria, tipo_articulo, descripcion, stock_total, stock_disponible, empresa_id, usuario_id } = data;
      const [result]: any = await conn.query(
        `INSERT INTO inventario_articulos 
         (nombre, categoria, tipo_articulo, descripcion, stock_total, stock_disponible, empresa_id, usuario_id, sincronizado, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
         [nombre, categoria, tipo_articulo, descripcion || '', stock_total || 0, stock_disponible || 0, empresa_id, usuario_id]
      );
      return { id: result.insertId, ...data };
    } catch (error) {
      console.error('Error al crear artículo:', error);
      throw error;
    }
  }

  // Editar un artículo
  static async editar(id: number, data: {
    nombre?: string;
    categoria?: string;
    tipo_articulo?: string;
    descripcion?: string;
    stock_total?: number;
    stock_disponible?: number;
    empresa_id?: number;
    usuario_id?: number;
  }): Promise<any> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        `UPDATE inventario_articulos SET ? WHERE id = ?`,
        [data, id]
      );
      if (result.affectedRows === 0) {
        throw new Error('Artículo no encontrado');
      }
      return { id, ...data };
    } catch (error) {
      console.error('Error al editar artículo:', error);
      throw error;
    }
  }

  // Eliminar un artículo
  static async eliminar(id: number): Promise<any> {
    const conn = await getConnection('local');
    try {
      const [result]: any = await conn.query(
        `DELETE FROM inventario_articulos WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) {
        throw new Error('Artículo no encontrado');
      }
      return { message: 'Artículo eliminado correctamente' };
    } catch (error) {
      console.error('Error al eliminar artículo:', error);
      throw error;
    }
  }
  
}
