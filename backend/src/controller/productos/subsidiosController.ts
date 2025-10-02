import { Request, Response, NextFunction } from 'express';
import { Subsidio, SubsidioInterface } from '../../models/productos/Subsidios';

/** Helpers de validación */
function validarPayloadCrear(data: any): { valid: boolean; error?: string } {
  const { nombre, tipo, porcentaje, monto_fijo, empresa_id } = data;
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return { valid: false, error: 'nombre inválido (mínimo 2 caracteres)' };
  }
  if (tipo !== 'porcentaje' && tipo !== 'fijo') {
    return { valid: false, error: 'tipo debe ser "porcentaje" o "fijo"' };
  }
  if (tipo === 'porcentaje') {
    if (porcentaje == null || typeof porcentaje !== 'number' || porcentaje <= 0) {
      return { valid: false, error: 'porcentaje requerido y > 0 para tipo "porcentaje"' };
    }
    if (monto_fijo != null) {
      return { valid: false, error: 'monto_fijo debe ser null para tipo "porcentaje"' };
    }
  } else {
    // tipo === 'fijo'
    if (monto_fijo == null || typeof monto_fijo !== 'number' || monto_fijo <= 0) {
      return { valid: false, error: 'monto_fijo requerido y > 0 para tipo "fijo"' };
    }
    if (porcentaje != null) {
      return { valid: false, error: 'porcentaje debe ser null para tipo "fijo"' };
    }
  }
  if (empresa_id == null || typeof empresa_id !== 'number' || empresa_id <= 0) {
    return { valid: false, error: 'empresa_id inválido' };
  }
  return { valid: true };
}

function validarPayloadEditar(data: any): { valid: boolean; error?: string } {
  const { tipo, porcentaje, monto_fijo, empresa_id } = data;
  if (tipo != null) {
    if (tipo !== 'porcentaje' && tipo !== 'fijo') {
      return { valid: false, error: 'tipo debe ser "porcentaje" o "fijo"' };
    }
    // Si viene tipo, forzamos validar ambos campos
    if (tipo === 'porcentaje') {
      if (porcentaje == null || typeof porcentaje !== 'number' || porcentaje <= 0) {
        return { valid: false, error: 'porcentaje requerido y > 0 para tipo "porcentaje"' };
      }
      if (monto_fijo != null) {
        return { valid: false, error: 'monto_fijo debe ser null para tipo "porcentaje"' };
      }
    } else {
      if (monto_fijo == null || typeof monto_fijo !== 'number' || monto_fijo <= 0) {
        return { valid: false, error: 'monto_fijo requerido y > 0 para tipo "fijo"' };
      }
      if (porcentaje != null) {
        return { valid: false, error: 'porcentaje debe ser null para tipo "fijo"' };
      }
    }
  }
  if (empresa_id != null) {
    if (typeof empresa_id !== 'number' || empresa_id <= 0) {
      return { valid: false, error: 'empresa_id inválido' };
    }
  }
  return { valid: true };
}

// Listar subsidios
export const listarSubsidios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subsidios = await Subsidio.listar();
    res.status(200).json(subsidios);
  } catch (error) {
    console.error('Error en listarSubsidios:', error);
    next(error);
  }
};

// Obtener subsidio por ID
export const obtenerSubsidio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const subsidio = await Subsidio.obtenerPorId(Number(id));
    if (!subsidio) {
      res.status(404).json({ error: 'Subsidio no encontrado' });
      return;
    }
    res.status(200).json(subsidio);
  } catch (error) {
    console.error('Error en obtenerSubsidio:', error);
    next(error);
  }
};

// Crear subsidio
export const crearSubsidio = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1) Validar payload
    const { valid, error } = validarPayloadCrear(req.body);
    if (!valid) {
      res.status(400).json({ error });
      return;
    }
    // 2) Delegar al modelo (que también valida tipo y nombre)
    const result = await Subsidio.crear(req.body as SubsidioInterface);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    // 3) Responder con el registro creado
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

// Editar subsidio
export const editarSubsidio = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    // 1) Validar campos a editar
    const { valid, error } = validarPayloadEditar(req.body);
    if (!valid) {
      res.status(400).json({ error });
      return;
    }
    // 2) Delegar al modelo
    const result = await Subsidio.editar(id, req.body as Partial<SubsidioInterface>);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    // 3) Responder con datos actualizados
    res.status(200).json(result.data);
  } catch (err) {
    next(err);
  }
};

// Eliminar subsidio
export const eliminarSubsidio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await Subsidio.eliminar(Number(req.params.id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error en eliminarSubsidio:', error);
    next(error);
  }
};
