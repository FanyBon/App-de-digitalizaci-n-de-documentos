import { Request, Response, NextFunction } from 'express';
import { Monedero } from '../../models/recargas/Monedero';
import { Empleado } from '../../models/Empleado';

export const listarMonederos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const monederos = await Monedero.listar();
    res.status(200).json(monederos);
  } catch (error) {
    console.error('Error en listarMonederos:', error);
    next(error);
  }
};

export const obtenerMonedero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const monedero = await Monedero.obtenerPorId(Number(id));
    if (!monedero) {
      res.status(404).json({ error: 'Monedero no encontrado' });
      return;
    }
    res.status(200).json(monedero);
  } catch (error) {
    console.error('Error en obtenerMonedero:', error);
    next(error);
  }
};

export const consultarSaldo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1) leer desde params o body
    const codigo = (req.params.codigo || req.body.codigo || '').trim();
    if (!codigo) {
      res.status(400).json({ error: 'Falta el código de barras' });
      return;
    }

    // 2) llamar al modelo
    const data = await Monedero.obtenerSaldoPorCodigo(codigo);
    if (!data) {
      res.status(404).json({ error: 'No existe monedero para ese código' });
      return;
    }

    // 3) responder
    res.status(200).json({
      empleado_id: data.empleado_id,
      saldo_actual: data.saldo_actual
    });
  } catch (err) {
    console.error('Error en consultarSaldo:', err);
    next(err);
  }
};

export const consultarSaldoQR = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const codigoQR = (req.params.qr || '').trim();
    if (!codigoQR) {
      res.status(400).json({ error: 'Falta el código QR' });
      return;
    }

    const data = await Monedero.obtenerSaldoPorQR(codigoQR);
    if (!data) {
      res.status(404).json({ error: 'No existe monedero para ese código QR' });
      return;
    }

    res.status(200).json({
      empleado_id: data.empleado_id,
      saldo_actual: data.saldo_actual
    });
  } catch (err) {
    console.error('Error en consultarSaldoQR:', err);
    next(err);
  }
};

export const crearMonedero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { empleado_id, saldo_actual, activo } = req.body;

    // Validación básica: verifica que existan los campos
    if (!empleado_id || saldo_actual === undefined || activo === undefined) {
      res.status(400).json({ error: 'Faltan campos obligatorios: empleado_id, saldo_actual, activo' });
      return;
    }

    // Crear el monedero
    const resultMonedero = await Monedero.crear({ empleado_id, saldo_actual, activo });
    if (!resultMonedero.success) {
      res.status(500).json({ error: resultMonedero.error });
      return;
    }

    // Extraer el id del monedero recién creado
    const monedero_id = resultMonedero.data.id;

    // Actualizar el empleado con el monedero_id asignado
    const resultEmpleado = await Empleado.actualizar(Number(empleado_id), { monedero_id });
    if (!resultEmpleado.success) {
      res.status(500).json({ error: 'Monedero creado, pero no se pudo asignar al empleado' });
      return;
    }

    res.status(201).json({
      message: 'Monedero creado y asignado correctamente al empleado',
      monedero: resultMonedero.data,
      empleadoActualizado: resultEmpleado.data
    });
  } catch (error) {
    console.error('Error en crearMonedero:', error);
    next(error);
  }
};
export const editarMonedero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body; // Puede incluir empleado_id, saldo_actual y/o activo

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    const result = await Monedero.editar(Number(id), data);
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Monedero actualizado correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarMonedero:', error);
    next(error);
  }
};

export const eliminarMonedero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    const result = await Monedero.eliminar(Number(id));
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(200).json({ message: 'Monedero eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarMonedero:', error);
    next(error);
  }
};
