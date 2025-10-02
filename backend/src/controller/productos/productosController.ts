import { Request, Response, NextFunction } from 'express';
import { Producto, ProductoInterface  } from '../../models/productos/Productos';

// Listar productos
export const listarProductos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productos = await Producto.listar();
    res.status(200).json(productos);
  } catch (error) {
    console.error('Error en listarProductos:', error);
    next(error);
  }
};

// Obtener producto por ID
export const obtenerProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const producto = await Producto.obtenerPorId(Number(id));
    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.status(200).json(producto);
  } catch (error) {
    console.error('Error en obtenerProducto:', error);
    next(error);
  }
};

// Crear producto con validación de unicidad
export const crearProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const producto = req.body;
     // Validación mínima
    if (!producto.nombre || !producto.codigo_barras) {
      res.status(400).json({ error: 'nombre y codigo_barras son obligatorios' });
      return;
    }
    // Opcional: validar impuetos_extra
    if (producto.inc_prodfin != null && ![0,1].includes(producto.inc_prodfin)) {
      res.status(400).json({ error: 'inc_prodfin debe ser 0 o 1' });
      return;
    }
    if (producto.impuestos_extra && !Array.isArray(producto.impuestos_extra)) {
      res.status(400).json({ error: 'impuestos_extra debe ser un array de IDs' });
      return;
    }
    // Se asume que en producto se envían los campos obligatorios como nombre y codigo_barras
    const result = await Producto.crear(producto);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearProducto:', error);
    next(error);
  }
};

export const editarProducto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'ID de producto es obligatorio' });
      return;
    }

    // Extraemos del body (sin forzar null)
    const {
    nombre,
      codigo_barras,
      descripcion,
      aplica_subsidio,
      familia_id,
      categoria_id,
      tipo_comedor,
      precio_venta,
      costo,
      subsidio_id,
      articulo_id,
      impuesto_id,
      inc_prodfin,
      impuestos_extra
    } = req.body as Partial<ProductoInterface>;

    // Validación mínima de obligatorios
    if (
      nombre === undefined ||
      codigo_barras === undefined ||
      descripcion === undefined ||
      aplica_subsidio === undefined ||
      familia_id === undefined ||
      categoria_id === undefined ||
      tipo_comedor === undefined ||
      precio_venta === undefined ||
      costo === undefined
    ) {
      res.status(400).json({ error: 'Faltan campos obligatorios para editar' });
      return;
    }

    // Armamos el objeto: solo incluimos subsidio_id o articulo_id
    const dataToUpdate: Partial<ProductoInterface> = {
      nombre,
      codigo_barras,
      descripcion,
      aplica_subsidio,
      familia_id,
      categoria_id,
      tipo_comedor,
      precio_venta,
      costo,
      // si viene como número, lo agregamos; si no, lo omitimos
      ...(subsidio_id   != null && { subsidio_id   }),
      ...(articulo_id  != null && { articulo_id   }),
      ...(impuesto_id  != null && { impuesto_id   }),
      ...(inc_prodfin  != null && { inc_prodfin   }),
      ...(Array.isArray(impuestos_extra) && { impuestos_extra })
    };

    const result = await Producto.editar(id, dataToUpdate);

    if (!result.success) {
      const status = result.error === 'Producto no encontrado' ? 404 : 400;
      res.status(status).json({ error: result.error });
      return;
    }

    // Retorna el producto con created_at original
    res.status(200).json({ message: 'Producto actualizado', data: result.data });
  } catch (error) {
    console.error('Error en editarProducto:', error);
    next(error);
  }
};
// Eliminar producto
export const eliminarProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await Producto.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarProducto:', error);
    next(error);
  }
};

// Buscar productos por nombre o código de barras
export const buscarProducto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === "") {
      res.status(400).json({ error: "El parámetro 'q' es obligatorio y debe ser un string no vacío" });
      return;
    }
    const productos = await Producto.buscar(q);
    if (productos.length === 0) {
      res.status(404).json({ message: "No se encontraron productos con el término proporcionado" });
      return;
    }
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error en buscarProducto:", error);
    next(error);
  }
};