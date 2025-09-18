import { Request, Response, NextFunction } from 'express';
import { Empresa } from '../../models/empresa/Empresa';

// Controlador para listar empresas
export const listarEmpresas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const empresas = await Empresa.listar();
    res.status(200).json(empresas);
  } catch (error) {
    console.error('Error en listarEmpresas:', error);
    next(error); // Maneja cualquier error inesperado
  }
};

// Crear empresa
export const crearEmpresa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      nombre,
      contacto,
      telefono,
      estatus = 'activo',
      parent_id,
      costo_charola = 0,
      estimado_personas = 0
    } = req.body;

    if (!nombre || !contacto || !telefono) {
      res.status(400).json({ error: 'Faltan campos obligatorios' });
      return;
    }

    const result = await Empresa.crear(
      nombre,
      contacto,
      telefono,
      estatus,
      parent_id,
      costo_charola,
      estimado_personas
    );

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error en crearEmpresa:', error);
    next(error);
  }
};

// Editar empresa
export const editarEmpresa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      contacto,
      telefono,
      estatus,
      parent_id,
      costo_charola,
      estimado_personas
    } = req.body;

    if (!id) {
      res.status(400).json({ error: 'ID de la empresa es obligatorio' });
      return;
    }

    const result = await Empresa.editar(Number(id), {
      nombre,
      contacto,
      telefono,
      estatus,
      parent_id,
      costo_charola,
      estimado_personas
    });

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Empresa actualizada correctamente', data: result.data });
  } catch (error) {
    console.error('Error en editarEmpresa:', error);
    next(error);
  }
};


// Controlador para eliminar empresa
export const eliminarEmpresa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params; // ID de la empresa a eliminar

    // Validación básica
    if (!id) {
      res.status(400).json({ error: 'ID de la empresa es obligatorio' });
      return;
    }

    const result = await Empresa.eliminar(Number(id));

    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Empresa eliminada correctamente' });
  } catch (error) {
    console.error('Error en eliminarEmpresa:', error);
    next(error); // Maneja cualquier error inesperado
  }
};

// Obtener una empresa por ID
export const obtenerEmpresa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Se requiere id de la empresa' });
      return;
    }
    // Como ejemplo, usamos el método listar y filtramos
    const empresas = await Empresa.listar();
    const empresa = empresas.find((e: any) => e.id == id);
    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }
    res.status(200).json(empresa);
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    next(error);
  }
};
