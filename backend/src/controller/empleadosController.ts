// src/controllers/control_comidas/empleadosController.ts
import { Request, Response, NextFunction } from 'express';
import { Empleado } from '../models/Empleado';
import QRCode from 'qrcode';

export const crearEmpleado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Desestructuramos también max_asistencias_por_dia
    const {
      nombre,
      cedula,
      empresa_id,
      codigo_barras,
      codigo_qr,
      activo,
      max_asistencias_por_dia,
    } = req.body;

    // Validación básica: ahora max_asistencias_por_dia es obligatorio
    if (
      !nombre ||
      !cedula ||
      !empresa_id ||
      max_asistencias_por_dia === undefined
    ) {
      res
        .status(400)
        .json({ error: 'Faltan campos obligatorios (incluyendo comidas por día)' });
      return;
    }

    // Creamos el empleado incluyendo el nuevo campo
    const result = await Empleado.crear(
      nombre,
      cedula,
      empresa_id,
      codigo_barras,
      codigo_qr,
      activo,
      max_asistencias_por_dia    // <-- parámetro extra
    );

    if (!result.success) {
      res.status(409).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearEmpleado:', error);
    next(error);
  }
};


export const listarEmpleados = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const empleados = await Empleado.listar();
    res.status(200).json(empleados);
  } catch (error) {
    console.error('Error en listarEmpleados:', error);
    next(error);
  }
};


export const editarEmpleado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      cedula,
      empresa_id,
      codigo_barras,
      activo,
      max_asistencias_por_dia,   // <-- lo desestructuramos aquí
    } = req.body;

    if (!id) {
      res.status(400).json({ error: 'ID del empleado es obligatorio' });
      return;
    }

    // Generamos la cadena QR igual que antes
    const contenidoQR = `${nombre} - ${cedula} - ${empresa_id} - ${codigo_barras}`;
    const codigoQRFinal = contenidoQR;

    // Actualizamos incluyendo el nuevo campo
    const result = await Empleado.actualizar(Number(id), {
      nombre,
      cedula,
      empresa_id,
      codigo_barras,
      codigo_qr: codigoQRFinal,
      activo,
      max_asistencias_por_dia,   // <-- lo enviamos al modelo
    });

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res
      .status(200)
      .json({ message: 'Empleado actualizado correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarEmpleado:', error);
    next(error);
  }
};


export const actualizarMonederoEmpleado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { monedero_id } = req.body;

    if (!id || monedero_id === undefined) {
      res
        .status(400)
        .json({ error: 'Se requieren el ID del empleado y el monedero_id' });
      return;
    }

    const result = await Empleado.actualizar(Number(id), { monedero_id });
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({
      message: 'Empleado actualizado con monedero_id correctamente',
      data: result.data,
    });
  } catch (error) {
    console.error('Error en actualizarMonederoEmpleado:', error);
    next(error);
  }
};


export const eliminarEmpleado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'ID del empleado es obligatorio' });
      return;
    }

    const result = await Empleado.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    res.status(200).json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarEmpleado:', error);
    next(error);
  }
};


export const buscarEmpleados = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === '') {
      res
        .status(400)
        .json({ error: "El parámetro 'q' es obligatorio y debe ser un string" });
      return;
    }

    const empleados = await Empleado.buscar(q);
    if (empleados.length === 0) {
      res
        .status(404)
        .json({ message: 'No se encontraron empleados con el término proporcionado' });
      return;
    }

    res.status(200).json(empleados);
  } catch (error) {
    console.error('Error en buscarEmpleados:', error);
    next(error);
  }
};
