// src/controllers/recargas/monederosController.ts
import { Request, Response, NextFunction } from 'express';
import { Monedero } from '../../models/recargas/Monedero';
import { Empleado } from '../../models/empleados/Empleado';

// Helper para extraer datos del usuario
const obtenerDatosUsuario = (req: Request) => {
  const userId = req.user?.id || 0;
  const userName = req.user?.nombre_usuario || 'Sistema';
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                    req.socket.remoteAddress || 
                    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { userId, userName, ipAddress, userAgent };
};

export const listarMonederos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const monederos = await Monedero.listar();
    res.status(200).json({
      total: monederos.length,
      data: monederos
    });
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
    const codigo = (req.params.codigo || req.body.codigo || '').trim();
    if (!codigo) {
      res.status(400).json({ error: 'Falta el código de barras' });
      return;
    }

    const data = await Monedero.obtenerSaldoPorCodigo(codigo);
    if (!data) {
      res.status(404).json({ error: 'No existe monedero para ese código' });
      return;
    }

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

    if (!empleado_id || saldo_actual === undefined || activo === undefined) {
      res.status(400).json({ error: 'Faltan campos obligatorios: empleado_id, saldo_actual, activo' });
      return;
    }

    // Obtener datos del usuario para auditoría
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    // Crear el monedero CON auditoría
    const resultMonedero = await Monedero.crear(
      { empleado_id, saldo_actual, activo },
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!resultMonedero.success) {
      res.status(400).json({ error: resultMonedero.error });
      return;
    }

    const monedero_id = resultMonedero.data.id;

    // Actualizar el empleado CON auditoría
    const resultEmpleado = await Empleado.actualizar(
      Number(empleado_id),
      { monedero_id },
      userId,
      userName,
      ipAddress,
      userAgent
    );

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
    const data = req.body;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    // Obtener datos del usuario para auditoría
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    // Editar CON auditoría
    const result = await Monedero.editar(
      Number(id),
      data,
      userId,
      userName,
      ipAddress,
      userAgent
    );

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

    // Obtener datos del usuario para auditoría
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    // Eliminar CON auditoría
    const result = await Monedero.eliminar(
      Number(id),
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Monedero desactivado correctamente' });
  } catch (error) {
    console.error('Error en eliminarMonedero:', error);
    next(error);
  }
};

export const eliminarMonederoPermanente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({ error: 'El ID es obligatorio y debe ser numérico' });
      return;
    }

    // Obtener datos del usuario para auditoría
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    // Eliminar permanentemente CON auditoría
    const result = await Monedero.eliminarPermanente(
      Number(id),
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Monedero eliminado permanentemente' });
  } catch (error) {
    console.error('Error en eliminarMonederoPermanente:', error);
    next(error);
  }
};