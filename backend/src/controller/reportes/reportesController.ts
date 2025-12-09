import { Request, Response, NextFunction } from 'express';
import { Reporte } from '../../models/reportes/Reporte';

// Controlador para listar todos los reportes
export const listarReportes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reportes = await Reporte.listar();
    res.status(200).json(reportes);
  } catch (error) {
    console.error('Error en listarReportes:', error);
    next(error);
  }
};

export const reportePorEmpleado = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const empresaId    = Number(req.query.empresa_id);
    const periodo      = String(req.query.periodo || '').trim();
    const fechaInicioQ = String(req.query.fecha_inicio || '').trim();
    const fechaFinQ    = String(req.query.fecha_fin || '').trim();
    const grouped      = req.query.grouped === 'true';

    if (!empresaId || isNaN(empresaId)) {
      res.status(400).json({ error: 'empresa_id es obligatorio y numérico' });
      return;
    }

    const hoy = new Date();
    let inicio: Date;
    let fin: Date = hoy;

    switch (periodo) {
      case 'thisWeek':
        // Lunes de esta semana
        const todayDow = hoy.getDay();                  // 0=Dom,1=Lun...
        const diffMon  = (todayDow + 6) % 7;            // convierte a 0=Lun…6=Dom
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - diffMon);
        break;

      case 'lastWeek':
        // Lunes y domingo de la semana pasada
        const dow = hoy.getDay();
        const monThis = new Date(hoy);
        monThis.setDate(hoy.getDate() - ((dow + 6) % 7));
        inicio = new Date(monThis);
        inicio.setDate(monThis.getDate() - 7);
        fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);
        break;

      case 'last15Days':
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 15);
        break;

      case 'lastMonth':
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 1);
        break;

      case 'last3Months':
        inicio = new Date(hoy);
        inicio.setMonth(hoy.getMonth() - 3);
        break;

      default:
        // Si enviaron fechas explícitas
        if (fechaInicioQ && fechaFinQ) {
          inicio = new Date(fechaInicioQ);
          fin    = new Date(fechaFinQ);
          break;
        }
        res.status(400).json({
          error:
            'Parámetros inválidos. Usa periodo=thisWeek|lastWeek|last15Days|lastMonth|last3Months, ' +
            'o envía fecha_inicio y fecha_fin en formato YYYY-MM-DD'
        });
        return;
    }

    // Formatear a 'YYYY-MM-DD'
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const fechaInicio = fmt(inicio);
    const fechaFin    = fmt(fin);

    const datos = await Reporte.generarPorEmpleado(
      empresaId,
      fechaInicio,
      fechaFin,
      grouped
    );

    res.status(200).json({
      empresa_id: empresaId,
      rango: { inicio: fechaInicio, fin: fechaFin },
      grouped,
      datos
    });
  } catch (err) {
    console.error('Error en reportePorEmpleado:', err);
    next(err);
  }
};

// Controlador para crear un nuevo reporte
export const crearReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fecha_inicio, fecha_fin, total_comidas, usuario_id, empresa_id } = req.body;

    // Validación básica
    if (!fecha_inicio || !fecha_fin || !total_comidas || !usuario_id || !empresa_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const result = await Reporte.crear(fecha_inicio, fecha_fin, total_comidas, usuario_id, empresa_id);

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearReporte:', error);
    next(error);
  }
};

// Controlador para editar reporte
export const editarReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params; // ID del reporte a editar
      const { fecha_inicio, fecha_fin, total_comidas, usuario_id, empresa_id } = req.body;
  
      // Validación básica
      if (!id) {
        res.status(400).json({ error: 'ID del reporte es obligatorio' });
        return;
      }
  
      const result = await Reporte.editar(Number(id), { fecha_inicio, fecha_fin, total_comidas, usuario_id, empresa_id });
  
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }
  
      res.status(200).json({ message: 'Reporte actualizado correctamente', data: result.data });
    } catch (error) {
      console.error('Error en editarReporte:', error);
      next(error);
    }
  };
  
  // Controlador para eliminar reporte
  export const eliminarReporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params; // ID del reporte a eliminar
  
      // Validación básica
      if (!id) {
        res.status(400).json({ error: 'ID del reporte es obligatorio' });
        return;
      }
  
      const result = await Reporte.eliminar(Number(id));
  
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }
  
      res.status(200).json({ message: 'Reporte eliminado correctamente' });
    } catch (error) {
      console.error('Error en eliminarReporte:', error);
      next(error);
    }
  };  
