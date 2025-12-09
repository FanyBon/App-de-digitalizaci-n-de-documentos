// src/models/CategoriasArticulos.ts
import { getPool } from '../../config/db_controlcomidas';

export interface CategoriaArticuloInterface {
  id?: number;
  nombre: string;
  descripcion: string;
  tipo: 'pdv' | 'comedor';
  empresa_id: number;
  created_at?: Date;
  updated_at?: Date;
}

export class CategoriaArticulo {
  // Validar si ya existe una categoría con el mismo nombre.
  // Si se pasa un ID para excluir, se omite ese registro (útil para la edición).
  static async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    const conn = getPool('local');
    try {
      let query = 'SELECT id FROM categorias_articulos WHERE nombre = ?';
      const params: any[] = [nombre];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [rows]: [any[], any] = await conn.query(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Error en validación de unicidad de categorías:', error);
      throw new Error('Error al validar categoría');
    }
  }

  // Listar todas las categorías
  static async listar(): Promise<CategoriaArticuloInterface[]> {
     const conn= getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM categorias_articulos');
      return rows;
    } catch (error) {
      console.error('Error al listar categorías:', error);
      throw new Error('Error al listar categorías');
    }
  }

  // Obtener una categoría por ID
  static async obtenerPorId(id: number): Promise<CategoriaArticuloInterface | null> {
    const conn = await getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM categorias_articulos WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      throw new Error('Error al obtener categoría');
    }
  }

  // Crear una nueva categoría con validación de nombre único
  static async crear(categoria: CategoriaArticuloInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');
    try {
      const existe = await CategoriaArticulo.existeNombre(categoria.nombre);
      if (existe) {
        return { success: false, error: 'Ya existe una categoría con ese nombre' };
      }
    } catch (error: any) {
      return { success: false, error: 'Error en validación de categoría' };
    }

    try {
      const [result]: any = await conn.query(
        `INSERT INTO categorias_articulos (nombre, descripcion, tipo, empresa_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [categoria.nombre, categoria.descripcion, categoria.tipo, categoria.empresa_id]
      );

      return {
        success: true,
        data: { id: result.insertId, ...categoria, created_at: new Date(), updated_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear categoría:', error);
      return { success: false, error: 'Error al crear la categoría' };
    }
  }

  // Editar una categoría. Se valida que el nombre no se repita (excluyendo el propio registro)
  static async editar(
    id: number,
    data: Partial<CategoriaArticuloInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');  
    // Si se está actualizando el nombre, validamos su unicidad
    if (data.nombre) {
      try {
        const existe = await CategoriaArticulo.existeNombre(data.nombre, id);
        if (existe) {
          return { success: false, error: 'Ya existe una categoría con ese nombre' };
        }
      } catch (error: any) {
        return { success: false, error: 'Error en validación de categoría' };
      }
    }
    try {
      const [result]: any = await conn.query(`UPDATE categorias_articulos SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Categoría no encontrada' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar categoría:', error);
      return { success: false, error: 'Error al editar la categoría' };
    }
  }

  // Eliminar una categoría
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getPool('local');
    try {
      const [result]: any = await conn.query(`DELETE FROM categorias_articulos WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Categoría no encontrada' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar categoría:', error);
      return { success: false, error: 'Error al eliminar la categoría' };
    }
  }
}