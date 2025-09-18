// src/controllers/control_comidas/asistenciasController.ts
import { Request, Response, NextFunction } from 'express';
import { Asistencia } from '../models/Asistencia';
import { getConnection } from '../config/db_controlcomidas';

// Controlador para listar todas las asistencias
export const listarAsistencias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asistencias = await Asistencia.listar();
    res.status(200).json(asistencias);
  } catch (error) {
    console.error('Error en listarAsistencias:', error);
    next(error);
  }
};

export const listarAsistenciasPorRango = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Leer parámetros de query string
    const empresaId = Number(req.query.empresa_id);
    const fechaInicio = String(req.query.start);
    const fechaFin = String(req.query.end);

    // Validaciones básicas
    if (
      !empresaId ||
      isNaN(empresaId) ||
      !fechaInicio ||
      !fechaFin ||
      isNaN(Date.parse(fechaInicio)) ||
      isNaN(Date.parse(fechaFin))
    ) {
      res.status(400).json({
        error:
          'Parámetros inválidos. Debes enviar empresa_id (numérico), start y end (YYYY-MM-DD).'
      });
      return;
    }

    // Llamada al modelo
    const asistencias = await Asistencia.listarPorEmpresaYRango(
      empresaId,
      fechaInicio,
      fechaFin
    );

    res.status(200).json(asistencias);
  } catch (err) {
    console.error('Error en listarAsistenciasPorRango:', err);
    next(err);
  }
};

// Controlador para crear una nueva asistencia
export const crearAsistencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { empleado_id, fecha, horario, metodo, empresa_id } = req.body;
  if (!empleado_id || !fecha || !horario || !metodo || !empresa_id) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const db = await getConnection();
  try {
    // 1. Traer límite y nombre del empleado
    const [rowsEmp]: any = await db.query(
      'SELECT nombre, max_asistencias_por_dia FROM empleados WHERE id = ?',
      [empleado_id]
    );
    if (!rowsEmp.length) {
      res.status(404).json({ error: 'Empleado no existe' });
      return;
    }
    const { nombre, max_asistencias_por_dia } = rowsEmp[0];

    // 2. Contar asistencias de hoy
    const [rowsCount]: any = await db.query(
      `SELECT COUNT(*) AS cnt 
         FROM asistencias 
        WHERE empleado_id = ? 
          AND DATE(fecha) = CURDATE()`,
      [empleado_id]
    );
    const yaPasos = rowsCount[0].cnt;

    // 3. Verificar límite
    if (yaPasos >= max_asistencias_por_dia) {
  res.status(409).json({
    code: 'MAX_ASISTENCIAS_EXCEDIDAS',
    message: `El empleado ${nombre} ya pasó ${yaPasos} veces. Límite: ${max_asistencias_por_dia}.`
  });
  return;    // aquí detenemos la ejecución y devolvemos void
}

    // 4. Si todo OK, crea la asistencia
    const result = await Asistencia.crear(empleado_id, fecha, horario, metodo, empresa_id);
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.status(201).json(result.data);

  } catch (error) {
    console.error('Error en crearAsistencia:', error);
    next(error);
  }
};

// Controlador para editar una asistencia
export const editarAsistencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params; // ID de la asistencia a editar
    const { empleado_id, fecha, horario, metodo, empresa_id } = req.body;
    
    if (!id) {
      res.status(400).json({ error: 'ID de la asistencia es obligatorio' });
      return;
    }
    
    const result = await Asistencia.editar(Number(id), { empleado_id, fecha, horario, metodo, empresa_id });
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    
    res.status(200).json({ message: 'Asistencia actualizada correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarAsistencia:', error);
    next(error);
  }
};

// Controlador para eliminar una asistencia, respaldándola previamente
export const eliminarAsistencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'ID de la asistencia es obligatorio' });
      return;
    }

    // Establecer conexión local para realizar respaldo y eliminación
    const dbLocal = await getConnection('local');
    // Obtener el registro de asistencia antes de borrarlo
    const [asistencia]: any = await dbLocal.query('SELECT * FROM asistencias WHERE id = ?', [id]);
    if (asistencia.length === 0) {
      res.status(404).json({ error: 'Asistencia no encontrada' });
      return;
    }
    // Respaldar la asistencia en la tabla historial_comidas, indicando tipo de cambio 'eliminación'
    await dbLocal.query(
      `INSERT INTO historial_comidas (asistencia_id, empresa_id, empleado_id, fecha, horario, metodo, tipo_cambio)
       VALUES (?, ?, ?, ?, ?, ?, 'eliminación')`,
      [id, asistencia[0].empresa_id, asistencia[0].empleado_id, asistencia[0].fecha, asistencia[0].horario, asistencia[0].metodo]
    );
    // Eliminar la asistencia
    await dbLocal.query('DELETE FROM asistencias WHERE id = ?', [id]);
    
    res.status(200).json({ message: 'Asistencia eliminada correctamente y respaldada en historial' });
  } catch (error) {
    console.error('Error en eliminarAsistencia:', error);
    next(error);
  }
};

// Controlador para registrar una comida con respaldo en historial_comidas
export const registrarComida = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empleado_id, fecha, horario, metodo, empresa_id } = req.body;
    
    if (!empleado_id || !fecha || !horario || !metodo || !empresa_id) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }
    
    const dbLocal = await getConnection('local');
    
    // Validar que la empresa existe
    const [empresaExistente]: any = await dbLocal.query('SELECT id FROM empresas WHERE id = ?', [empresa_id]);
    if (empresaExistente.length === 0) {
      res.status(400).json({ error: 'La empresa no existe' });
      return;
    }
    
    // Iniciar una transacción para tener consistencia en los datos
    await dbLocal.query('START TRANSACTION');
    try {
      // Insertar la asistencia y marcarla como pendiente de sincronización (0)
      const [result]: any = await dbLocal.query(
        `INSERT INTO asistencias (empleado_id, fecha, horario, metodo, empresa_id, sincronizado, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [empleado_id, fecha, horario, metodo, empresa_id]
      );
      const asistencia_id = result.insertId;
      
      // Respaldar el registro en la tabla historial_comidas con tipo_cambio 'registro'
      await dbLocal.query(
        `INSERT INTO historial_comidas (asistencia_id, empresa_id, empleado_id, fecha, horario, metodo, tipo_cambio)
         VALUES (?, ?, ?, ?, ?, ?, 'registro')`,
        [asistencia_id, empresa_id, empleado_id, fecha, horario, metodo]
      );
      
      // Confirmar la transacción
      await dbLocal.query('COMMIT');
      res.status(201).json({ message: 'Comida registrada y respaldada en historial' });
    } catch (error) {
      // Si ocurre algún error, hacer rollback
      await dbLocal.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al registrar comida:', error);
    res.status(500).json({ 
      message: 'Error interno al registrar comida', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};