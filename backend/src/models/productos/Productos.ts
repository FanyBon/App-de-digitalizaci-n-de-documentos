// src/models/Productos.ts
import { getConnection } from '../../config/db_controlcomidas';

export interface ProductoInterface {
  id?: number;
  nombre: string;
  codigo_barras: string;
  descripcion: string;
  aplica_subsidio: number;
  familia_id: number;
  categoria_id: number;
  tipo_comedor: 'desayuno' | 'comida' | 'cena';
  precio_venta: number;
  costo: number;
  subsidio_id?: number;
  articulo_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class Producto {
  // Verifica si ya existe un producto con el mismo nombre o codigo_barras. En edición, se excluye el ID actual.
  static async existeNombreOCodigo(nombre: string, codigo_barras: string, excludeId?: number): Promise<boolean> {
    const conn = await getConnection();
    try {
      let query = 'SELECT id FROM productos WHERE (nombre = ? OR codigo_barras = ?)';
      const params: any[] = [nombre, codigo_barras];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [rows]: [any[], any] = await conn.query(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Error en validación de unicidad:', error);
      throw new Error('Error al validar datos de producto');
    }
  }

  // Listar todos los productos
  static async listar(): Promise<ProductoInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM productos');
      return rows;
    } catch (error) {
      console.error('Error al listar productos:', error);
      throw new Error('Error al listar productos');
    }
  }

  // Obtener un producto por ID
  static async obtenerPorId(id: number): Promise<ProductoInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM productos WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener producto:', error);
      throw new Error('Error al obtener producto');
    }
  }

  // Crear un nuevo producto (se valida la unicidad de nombre y codigo_barras)
  static async crear(producto: ProductoInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    // Validamos si ya existe algun producto con ese nombre o codigo.
    try {
      const existe = await Producto.existeNombreOCodigo(producto.nombre, producto.codigo_barras);
      if (existe) {
        return { success: false, error: 'Ya existe un producto con ese nombre o código de barras' };
      }
    } catch (error: any) {
      return { success: false, error: 'Error en validación de producto' };
    }
    
    try {
      const [result]: any = await conn.query(
        `INSERT INTO productos (nombre, codigo_barras, descripcion, aplica_subsidio, familia_id, categoria_id, 
          tipo_comedor, precio_venta, costo, subsidio_id, articulo_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          producto.nombre, producto.codigo_barras, producto.descripcion, producto.aplica_subsidio,
          producto.familia_id, producto.categoria_id, producto.tipo_comedor,
          producto.precio_venta, producto.costo, producto.subsidio_id, producto.articulo_id
        ]
      );

      return {
        success: true,
        data: { id: result.insertId, ...producto, created_at: new Date(), updated_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear producto:', error);
      return { success: false, error: 'Error al crear el producto' };
    }
  }

  // Editar un producto (validando que el nombre y codigo de barras no existan en otro registro)
  static async editar(
    id: number,
    data: Partial<ProductoInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();

    // Valida unicidad si cambió nombre o código
    if (data.nombre && data.codigo_barras) {
      try {
        const existe = await Producto.existeNombreOCodigo(
          data.nombre,
          data.codigo_barras,
          id
        );
        if (existe) {
          return {
            success: false,
            error: 'Ya existe un producto con ese nombre o código de barras'
          };
        }
      } catch (err: any) {
        return { success: false, error: 'Error en validación de producto' };
      }
    }

    // Actualiza sólo campos editables + updated_at
    try {
      const sql = `
        UPDATE productos
          SET
            nombre          = ?,
            codigo_barras   = ?,
            descripcion     = ?,
            aplica_subsidio = ?,
            familia_id      = ?,
            categoria_id    = ?,
            tipo_comedor    = ?,
            precio_venta    = ?,
            costo           = ?,
            subsidio_id     = ?,
            articulo_id     = ?,
            updated_at      = NOW()
        WHERE id = ?
      `;
      const params = [
        data.nombre,
        data.codigo_barras,
        data.descripcion,
        data.aplica_subsidio,
        data.familia_id,
        data.categoria_id,
        data.tipo_comedor,
        data.precio_venta,
        data.costo,
        data.subsidio_id,
        data.articulo_id,
        id
      ];

      const [result]: any = await conn.query(sql, params);
      if (result.affectedRows === 0) {
        return { success: false, error: 'Producto no encontrado' };
      }

      // Devuelve el registro completo actualizado
      const actualizado = await Producto.obtenerPorId(id);
      return { success: true, data: actualizado };
    } catch (err: any) {
      console.error('Error al editar producto:', err);
      return { success: false, error: 'Error al editar el producto' };
    }
  }

  // Eliminar un producto
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM productos WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Producto no encontrado' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      return { success: false, error: 'Error al eliminar el producto' };
    }
  }

  // Buscar productos por nombre o código de barras
  static async buscar(q: string): Promise<ProductoInterface[]> {
    const conn = await getConnection();
    try {
      if (!q || q.trim() === "") {
        return []; // Retorna lista vacía si no hay término de búsqueda
      }
      const likeQuery = `%${q}%`;
      const [rows]: [any[], any] = await conn.query(
        `SELECT * FROM productos WHERE nombre LIKE ? OR codigo_barras LIKE ?`,
        [likeQuery, likeQuery]
      );
      return rows;
    } catch (error) {
      console.error("Error al buscar productos:", error);
      throw new Error("Error al buscar productos");
    }
  }
}
