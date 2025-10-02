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
  impuesto_id?: number;
  inc_prodfin?: number;      // 0 = base, 1 = incluye impuestos
  impuestos_extra?: number[]; 
  created_at?: Date;
  updated_at?: Date;
}

export class Producto {
  /** Verifica unicidad de nombre o código de barras. */
  static async existeNombreOCodigo(
    nombre: string,
    codigo_barras: string,
    excludeId?: number
  ): Promise<boolean> {
    const conn = await getConnection();
    try {
      let sql = 'SELECT id FROM productos WHERE (nombre = ? OR codigo_barras = ?)';
      const params: any[] = [nombre, codigo_barras];
      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }
      const [rows]: [any[], any] = await conn.query(sql, params);
      return rows.length > 0;
    } catch (err) {
      console.error('Error en validación de unicidad:', err);
      throw new Error('Error al validar datos de producto');
    }
  }

  /** Lista todos los productos (no incluye impuestos_extra). */
  static async listar(): Promise<ProductoInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM productos');
      return rows;
    } catch (err) {
      console.error('Error al listar productos:', err);
      throw new Error('Error al listar productos');
    }
  }

  /** Obtiene un producto por ID y carga sus impuestos_extra. */
  static async obtenerPorId(id: number): Promise<ProductoInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] =
        await conn.query('SELECT * FROM productos WHERE id = ?', [id]);
      if (!rows.length) return null;

      const producto: ProductoInterface = rows[0];
      producto.impuestos_extra = await this.getImpuestosExtra(id);
      return producto;
    } catch (err) {
      console.error('Error al obtener producto:', err);
      throw new Error('Error al obtener producto');
    }
  }

  /** Crea un producto y sus impuestos_extra dentro de un solo bloque try/catch. */
  static async crear(
    producto: ProductoInterface
  ): Promise<{ success: boolean; data?: ProductoInterface; error?: string }> {
    const conn = await getConnection();
    try {
      // 1) Validar unicidad
      const existe = await this.existeNombreOCodigo(
        producto.nombre,
        producto.codigo_barras
      );
      if (existe) {
        return {
          success: false,
          error: 'Ya existe un producto con ese nombre o código de barras'
        };
      }

      // 2) Insertar en productos
      const [res]: any = await conn.query(
        `INSERT INTO productos
          (nombre, codigo_barras, descripcion, aplica_subsidio,
           familia_id, categoria_id, tipo_comedor,
           precio_venta, costo, subsidio_id, articulo_id,
           impuesto_id, inc_prodfin,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          producto.nombre,
          producto.codigo_barras,
          producto.descripcion,
          producto.aplica_subsidio,
          producto.familia_id,
          producto.categoria_id,
          producto.tipo_comedor,
          producto.precio_venta,
          producto.costo,
          producto.subsidio_id  || null,
          producto.articulo_id || null,
          producto.impuesto_id  || null,
          producto.inc_prodfin  || 0
        ]
      );
      const id = res.insertId;

      // 3) Guardar impuestos_extra si vienen en el DTO
      if (Array.isArray(producto.impuestos_extra) && producto.impuestos_extra.length) {
        await this.setImpuestosExtra(conn, id, producto.impuestos_extra);
      }

      // 4) Devolver el producto completo
      const creado = await this.obtenerPorId(id);
      return { success: true, data: creado! };
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      return { success: false, error: err.message || 'Error al crear el producto' };
    }
  }

  /** Edita un producto y reemplaza sus impuestos_extra. */
  static async editar(
    id: number,
    data: Partial<ProductoInterface>
  ): Promise<{ success: boolean; data?: ProductoInterface; error?: string }> {
    const conn = await getConnection();
    try {
      // 1) Validar unicidad si cambiaron nombre o código
      if (data.nombre && data.codigo_barras) {
        const existe = await this.existeNombreOCodigo(
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
      }

      // 2) Actualizar campos
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
            impuesto_id     = ?,
            inc_prodfin     = ?,
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
        data.subsidio_id  || null,
        data.articulo_id || null,
        data.impuesto_id  || null,
        data.inc_prodfin != null ? data.inc_prodfin : 0,
        id
      ];
      const [result]: any = await conn.query(sql, params);
      if (result.affectedRows === 0) {
        return { success: false, error: 'Producto no encontrado' };
      }

      // 3) Reemplazar impuestos_extra si los proporciona el DTO
      if (Array.isArray(data.impuestos_extra)) {
        await this.setImpuestosExtra(conn, id, data.impuestos_extra);
      }

      // 4) Devolver producto actualizado
      const actualizado = await this.obtenerPorId(id);
      return { success: true, data: actualizado! };
    } catch (err: any) {
      console.error('Error al editar producto:', err);
      return { success: false, error: err.message || 'Error al editar el producto' };
    }
  }

  /** Elimina un producto (hard delete). */
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [res]: any = await conn.query(
        'DELETE FROM productos WHERE id = ?',
        [id]
      );
      if (res.affectedRows === 0) {
        return { success: false, error: 'Producto no encontrado' };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Error al eliminar producto:', err);
      return { success: false, error: 'Error al eliminar producto' };
    }
  }

  /** Busca productos por nombre o código de barras. */
  static async buscar(q: string): Promise<ProductoInterface[]> {
    const conn = await getConnection();
    try {
      if (!q || q.trim() === '') return [];
      const likeQ = `%${q}%`;
      const [rows]: [any[], any] = await conn.query(
        'SELECT * FROM productos WHERE nombre LIKE ? OR codigo_barras LIKE ?',
        [likeQ, likeQ]
      );
      return rows;
    } catch (err: any) {
      console.error('Error al buscar productos:', err);
      throw new Error('Error al buscar productos');
    }
  }

  /**
   * Elimina y vuelve a insertar los impuestos_extra de un producto.
   * Con manejo de errores interno.
   */
  private static async setImpuestosExtra(
    conn: any,
    productoId: number,
    impuestos: number[]
  ) {
    try {
      // Borrar los previos
      await conn.query(
        'DELETE FROM producto_impuesto_extra WHERE producto_id = ?',
        [productoId]
      );
      if (!impuestos.length) return;

      // Insertar los nuevos
      const rows = impuestos.map(impuestoId => [productoId, impuestoId]);
      await conn.query(
        'INSERT INTO producto_impuesto_extra (producto_id, impuesto_id) VALUES ?',
        [rows]
      );
    } catch (err) {
      console.error('Error al asignar impuestos_extra:', err);
      throw new Error('Error al asignar impuestos extra');
    }
  }

  /**
   * Consulta los impuestos_extra asignados a un producto.
   * Con manejo de errores interno.
   */
  static async getImpuestosExtra(productoId: number): Promise<number[]> {
    const conn = await getConnection();
    try {
      const [rows]: any[] = await conn.query(
        'SELECT impuesto_id FROM producto_impuesto_extra WHERE producto_id = ?',
        [productoId]
      );
      return rows.map((r: any) => r.impuesto_id);
    } catch (err) {
      console.error('Error al obtener impuestos_extra:', err);
      throw new Error('Error al obtener impuestos extra');
    }
  }
}