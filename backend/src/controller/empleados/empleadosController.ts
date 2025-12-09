// src/controllers/empleados/empleadosController.ts
import { Request, Response, NextFunction } from 'express';
import { Empleado } from '../../models/empleados/Empleado';
import { hashNip } from '../../utils/nip';

// ====================================
// TYPES - IMPORTAR AuthPayload DEL MIDDLEWARE
// ====================================

// Usar el AuthPayload que ya existe en authMiddleware
// que tiene: id, email, nombre_usuario, empresa_id, roles, perfiles, etc.
type AuthenticatedRequest = Request;

// ====================================
// HELPER: EXTRAER DATOS DEL USUARIO
// ====================================

const obtenerDatosUsuario = (req: AuthenticatedRequest) => {
  const userId = req.user?.id || 0;
  const userName = req.user?.nombre_usuario || 'Sistema';  // ← Cambio: nombre_usuario
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                    req.socket.remoteAddress || 
                    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  return { userId, userName, ipAddress, userAgent };
};

// ====================================
// CREAR EMPLEADO
// ====================================

export const crearEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      nombre,
      cedula,
      empresa_id,
      codigo_barras,
      codigo_qr,
      activo,
      max_asistencias_por_dia,
      aplica_subsidio,
      id_ubicacion_empleado,
      sincronizado,
      monedero_id
    } = req.body;

    // Validaciones obligatorias
    if (!nombre || !cedula || !empresa_id) {
      res.status(400).json({ 
        error: 'Faltan campos obligatorios',
        campos_requeridos: ['nombre', 'cedula', 'empresa_id']
      });
      return;
    }

    // Validar formato de cédula (puedes ajustar según tu país)
    if (cedula.length < 5) {
      res.status(400).json({ error: 'La cédula debe tener al menos 5 caracteres' });
      return;
    }

    // Validar max_asistencias_por_dia
    const maxAsistencias = max_asistencias_por_dia !== undefined 
      ? parseInt(max_asistencias_por_dia) 
      : 1;

    if (maxAsistencias < 1 || maxAsistencias > 10) {
      res.status(400).json({ 
        error: 'Las comidas por día deben estar entre 1 y 10' 
      });
      return;
    }

    // Obtener datos del usuario autenticado
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    // Crear empleado
    const result = await Empleado.crear(
      {
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        empresa_id: parseInt(empresa_id),
        codigo_barras,
        codigo_qr,
        activo: activo !== undefined ? activo : true,
        max_asistencias_por_dia: maxAsistencias,
        aplica_subsidio: aplica_subsidio || false,
        id_ubicacion_empleado,
        sincronizado: sincronizado || false,
        monedero_id: monedero_id || null
      },
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(409).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: 'Empleado creado exitosamente',
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error en crearEmpleado:', error);
    next(error);
  }
};

// ====================================
// LISTAR EMPLEADOS
// ====================================

export const listarEmpleados = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { incluir_inactivos } = req.query;
    
    let empleados;
    if (incluir_inactivos === 'true') {
      empleados = await Empleado.listarTodos();
    } else {
      empleados = await Empleado.listar();
    }

    res.status(200).json({
      total: empleados.length,
      data: empleados
    });
  } catch (error) {
    console.error('❌ Error en listarEmpleados:', error);
    next(error);
  }
};

// ====================================
// OBTENER EMPLEADO POR ID
// ====================================

export const obtenerEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    const empleado = await Empleado.obtenerPorId(parseInt(id));

    if (!empleado) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    res.status(200).json(empleado);
  } catch (error) {
    console.error('❌ Error en obtenerEmpleado:', error);
    next(error);
  }
};

// ====================================
// OBTENER HISTORIAL DE EMPLEADO
// ====================================

export const obtenerHistorialEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    const historial = await Empleado.obtenerHistorial(parseInt(id));

    res.status(200).json({
      empleado_id: parseInt(id),
      total_registros: historial.length,
      historial: historial
    });
  } catch (error) {
    console.error('❌ Error en obtenerHistorialEmpleado:', error);
    next(error);
  }
};

// ====================================
// EDITAR EMPLEADO
// ====================================

export const editarEmpleado = async (
  req: AuthenticatedRequest,
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
      codigo_qr,
      activo,
      max_asistencias_por_dia,
      aplica_subsidio,
      id_ubicacion_empleado,
      sincronizado,
      monedero_id
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    // Validar max_asistencias_por_dia si se proporciona
    if (max_asistencias_por_dia !== undefined) {
      const maxAsistencias = parseInt(max_asistencias_por_dia);
      if (maxAsistencias < 1 || maxAsistencias > 10) {
        res.status(400).json({ 
          error: 'Las comidas por día deben estar entre 1 y 10' 
        });
        return;
      }
    }

    // Obtener datos del usuario autenticado
    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    // Construir objeto de actualización
    const camposActualizacion: any = {};
    if (nombre !== undefined) camposActualizacion.nombre = nombre.trim();
    if (cedula !== undefined) camposActualizacion.cedula = cedula.trim();
    if (empresa_id !== undefined) camposActualizacion.empresa_id = parseInt(empresa_id);
    if (codigo_barras !== undefined) camposActualizacion.codigo_barras = codigo_barras;
    if (codigo_qr !== undefined) camposActualizacion.codigo_qr = codigo_qr;
    if (activo !== undefined) camposActualizacion.activo = activo;
    if (max_asistencias_por_dia !== undefined) {
      camposActualizacion.max_asistencias_por_dia = parseInt(max_asistencias_por_dia);
    }
    if (aplica_subsidio !== undefined) camposActualizacion.aplica_subsidio = aplica_subsidio;
    if (id_ubicacion_empleado !== undefined) {
      camposActualizacion.id_ubicacion_empleado = id_ubicacion_empleado;
    }
    if (sincronizado !== undefined) camposActualizacion.sincronizado = sincronizado;
    if (monedero_id !== undefined) camposActualizacion.monedero_id = monedero_id;

    const result = await Empleado.actualizar(
      parseInt(id),
      camposActualizacion,
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({
      message: 'Empleado actualizado exitosamente',
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error en editarEmpleado:', error);
    next(error);
  }
};

// ====================================
// DESACTIVAR EMPLEADO (SOFT DELETE)
// ====================================

export const desactivarEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const result = await Empleado.desactivar(
      parseInt(id),
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Empleado desactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error en desactivarEmpleado:', error);
    next(error);
  }
};

// ====================================
// REACTIVAR EMPLEADO
// ====================================

export const reactivarEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const result = await Empleado.reactivar(
      parseInt(id),
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Empleado reactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error en reactivarEmpleado:', error);
    next(error);
  }
};

// ====================================
// ELIMINAR PERMANENTE (HARD DELETE)
// ====================================

export const eliminarEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const result = await Empleado.eliminarPermanente(
      parseInt(id),
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Empleado eliminado permanentemente' });
  } catch (error) {
    console.error('❌ Error en eliminarEmpleado:', error);
    next(error);
  }
};

// ====================================
// BUSCAR EMPLEADOS
// ====================================

export const buscarEmpleados = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, incluir_inactivos } = req.query;

    if (!q || typeof q !== 'string' || q.trim() === '') {
      res.status(400).json({ 
        error: "El parámetro 'q' es obligatorio y debe ser un string" 
      });
      return;
    }

    const soloActivos = incluir_inactivos !== 'true';
    const empleados = await Empleado.buscar(q, soloActivos);

    if (empleados.length === 0) {
      res.status(404).json({ 
        message: 'No se encontraron empleados con el término proporcionado',
        termino_busqueda: q
      });
      return;
    }

    res.status(200).json({
      total: empleados.length,
      termino_busqueda: q,
      data: empleados
    });
  } catch (error) {
    console.error('❌ Error en buscarEmpleados:', error);
    next(error);
  }
};

// ====================================
// GESTIONAR NIP
// ====================================

export const setNip = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const nipPlain = String(req.body.nip || '').trim();

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    if (!/^\d{4,}$/.test(nipPlain)) {
      res.status(400).json({ 
        error: 'NIP inválido. Debe ser al menos 4 dígitos numéricos' 
      });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const nipHash = await hashNip(nipPlain);
    const result = await Empleado.establecerNip(
      parseInt(id),
      nipHash,
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({ 
      message: 'NIP establecido exitosamente',
      ok: true 
    });
  } catch (error) {
    console.error('❌ Error en setNip:', error);
    next(error);
  }
};

// ====================================
// ACTUALIZAR MONEDERO
// ====================================

export const actualizarMonederoEmpleado = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { monedero_id } = req.body;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({ error: 'ID de empleado inválido' });
      return;
    }

    if (monedero_id === undefined) {
      res.status(400).json({ error: 'Se requiere el campo monedero_id' });
      return;
    }

    const { userId, userName, ipAddress, userAgent } = obtenerDatosUsuario(req);

    const result = await Empleado.actualizarMonedero(
      parseInt(id),
      monedero_id,
      userId,
      userName,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({
      message: 'Monedero del empleado actualizado exitosamente',
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error en actualizarMonederoEmpleado:', error);
    next(error);
  }
};