import { Request, Response, NextFunction } from "express";
import { InventarioChips } from "../../models/inventario/InventarioChips";

// Listar todos los registros de detalles de chips
export const listarChips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chips = await InventarioChips.listar();
    res.status(200).json(chips);
  } catch (error) {
    console.error("Error en listar detalles de chips:", error);
    next(error);
  }
};

// Crear un registro de detalles para un chip
export const crearChip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inventario_id, numero_telefono, compania, fecha_actualizacion_plan, ubicacion_actual } = req.body;
    if (!inventario_id || !numero_telefono || !compania || !fecha_actualizacion_plan || !ubicacion_actual) {
      res.status(400).json({ error: "Faltan campos obligatorios para registrar los detalles del chip" });
      return;
    }
    const chipDetail = await InventarioChips.crear({
      inventario_id,
      numero_telefono,
      compania,
      fecha_actualizacion_plan,
      ubicacion_actual,
    });
    res.status(201).json(chipDetail);
  } catch (error) {
    console.error("Error en crear detalles de chip:", error);
    next(error);
  }
};

// Editar los detalles de un chip
export const editarChip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!id) {
      res.status(400).json({ error: "ID de detalles del chip es obligatorio" });
      return;
    }
    const chipDetail = await InventarioChips.editar(Number(id), data);
    res.status(200).json({ message: "Detalles del chip actualizados correctamente", data: chipDetail });
  } catch (error) {
    console.error("Error en editar detalles de chip:", error);
    next(error);
  }
};

// Eliminar un registro de detalles de chip
export const eliminarChip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "ID de detalles del chip es obligatorio" });
      return;
    }
    const resp = await InventarioChips.eliminar(Number(id));
    res.status(200).json(resp);
  } catch (error) {
    console.error("Error en eliminar detalles de chip:", error);
    next(error);
  }
};
