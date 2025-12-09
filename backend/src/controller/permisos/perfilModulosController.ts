// src/controller/permisos/perfilModulosController.ts
import { Request, Response } from 'express';
import { PerfilModulo } from '../../models/permisos/PerfilModulo';

/** Helper: Extraer contexto de auditoría */
function getAuditoriaContext(req: Request) {
  return {
    usuario_id: req.user!.id,
    usuario_nombre: req.user!.nombre_usuario,
    ip: req.ip || req.socket.remoteAddress,
    user_agent: req.get('user-agent')
  };
}

/**
 * GET /api/perfiles/:perfil_id/modulos
 * Listar módulos activos de un perfil
 */
export const listarModulosDePerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);

    if (isNaN(perfilId)) {
      res.status(400).json({ error: 'ID de perfil inválido' });
      return;
    }

    const modulos = await PerfilModulo.getModulosByPerfil(perfilId);

    res.status(200).json({
      perfil_id: perfilId,
      total: modulos.length,
      data: modulos
    });
  } catch (error: any) {
    console.error('Error en listarModulosDePerfil:', error);
    res.status(500).json({ error: 'Error al listar módulos del perfil' });
  }
};

/**
 * GET /api/modulos-frontend/:modulo_id/perfiles
 * Listar perfiles activos que tienen un módulo específico
 */
export const listarPerfilesConModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const moduloId = Number(req.params.modulo_id);

    if (isNaN(moduloId)) {
      res.status(400).json({ error: 'ID de módulo inválido' });
      return;
    }

    const perfiles = await PerfilModulo.getPerfilesByModulo(moduloId);

    res.status(200).json({
      modulo_id: moduloId,
      total: perfiles.length,
      data: perfiles
    });
  } catch (error: any) {
    console.error('Error en listarPerfilesConModulo:', error);
    res.status(500).json({ error: 'Error al listar perfiles con este módulo' });
  }
};

/**
 * POST /api/perfiles/:perfil_id/modulos
 * Asignar módulo a perfil (o reactivar)
 * Body: { "modulo_id": 3 }
 */
export const asignarModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);
    const { modulo_id } = req.body;

    // Validaciones
    if (isNaN(perfilId)) {
      res.status(400).json({ error: 'ID de perfil inválido' });
      return;
    }

    if (!modulo_id || isNaN(Number(modulo_id))) {
      res.status(400).json({ error: 'modulo_id es obligatorio y debe ser numérico' });
      return;
    }

    const result = await PerfilModulo.assign(
      perfilId,
      Number(modulo_id),
      getAuditoriaContext(req)
    );

    const modulos = await PerfilModulo.getModulosByPerfil(perfilId);

    if (result.created) {
      res.status(201).json({
        mensaje: 'Módulo asignado exitosamente',
        perfil_id: perfilId,
        modulo_id: Number(modulo_id),
        modulos_actuales: modulos
      });
    } else if (result.reactivated) {
      res.status(200).json({
        mensaje: 'Módulo reactivado exitosamente',
        perfil_id: perfilId,
        modulo_id: Number(modulo_id),
        modulos_actuales: modulos
      });
    }

    console.log(
      `✓ PERFIL-MODULO: Asignado modulo_id=${modulo_id} a perfil_id=${perfilId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en asignarModulo:', error);

    if (
      error.message === 'Perfil no encontrado o inactivo' ||
      error.message === 'Módulo no encontrado o inactivo'
    ) {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El módulo ya está asignado al perfil') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al asignar módulo' });
    }
  }
};

/**
 * DELETE /api/perfiles/:perfil_id/modulos/:modulo_id
 * Remover módulo de perfil (soft delete)
 */
export const removerModulo = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);
    const moduloId = Number(req.params.modulo_id);

    // Validaciones
    if (isNaN(perfilId) || isNaN(moduloId)) {
      res.status(400).json({ error: 'IDs inválidos' });
      return;
    }

    const removed = await PerfilModulo.remove(
      perfilId,
      moduloId,
      getAuditoriaContext(req)
    );

    if (!removed) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    const modulos = await PerfilModulo.getModulosByPerfil(perfilId);

    res.status(200).json({
      mensaje: 'Módulo removido exitosamente',
      perfil_id: perfilId,
      modulo_id: moduloId,
      modulos_actuales: modulos
    });

    console.log(
      `✓ PERFIL-MODULO: Removido modulo_id=${moduloId} de perfil_id=${perfilId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en removerModulo:', error);

    if (error.message === 'La asignación no existe o ya está inactiva') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al remover módulo' });
    }
  }
};

/**
 * PUT /api/perfiles/:perfil_id/modulos/sync
 * Sincronizar módulos (reemplazar todos)
 * Body: { "modulo_ids": [1, 2, 3, 5, 8] }
 */
export const sincronizarModulos = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);
    const { modulo_ids } = req.body;

    // Validaciones
    if (isNaN(perfilId)) {
      res.status(400).json({ error: 'ID de perfil inválido' });
      return;
    }

    if (!Array.isArray(modulo_ids)) {
      res.status(400).json({ error: 'modulo_ids debe ser un array' });
      return;
    }

    // Validar que todos sean números
    const moduloIdsNumericos = modulo_ids.map(Number);
    if (moduloIdsNumericos.some(isNaN)) {
      res.status(400).json({ error: 'Todos los modulo_ids deben ser numéricos' });
      return;
    }

    await PerfilModulo.syncModulos(
      perfilId,
      moduloIdsNumericos,
      getAuditoriaContext(req)
    );

    const modulosActuales = await PerfilModulo.getModulosByPerfil(perfilId);

    res.status(200).json({
      mensaje: 'Módulos sincronizados exitosamente',
      perfil_id: perfilId,
      total_modulos: modulosActuales.length,
      data: modulosActuales
    });

    console.log(
      `✓ PERFIL-MODULO: Sincronizados módulos de perfil_id=${perfilId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en sincronizarModulos:', error);
    res.status(500).json({ error: 'Error al sincronizar módulos' });
  }
};

/**
 * GET /api/perfiles/:perfil_id/modulos/historial
 * Obtener historial de auditoría de asignaciones de un perfil
 */
export const obtenerHistorialPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);

    if (isNaN(perfilId)) {
      res.status(400).json({ error: 'ID de perfil inválido' });
      return;
    }

    const historial = await PerfilModulo.getHistorialByPerfil(perfilId);

    res.status(200).json({
      perfil_id: perfilId,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialPerfil:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};