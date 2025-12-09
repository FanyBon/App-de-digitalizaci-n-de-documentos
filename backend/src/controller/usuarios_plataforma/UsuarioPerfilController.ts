// src/controller/usuarios_plataforma/UsuarioPerfilController.ts
import { Request, Response } from 'express';
import { UsuarioPerfil } from '../../models/usuarios_plataforma/UsuarioPerfil';

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
 * GET /api/usuarios/:usuario_id/perfiles
 * Listar perfiles activos de un usuario
 */
export const listarPerfilesDeUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuario_id);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const perfiles = await UsuarioPerfil.getPerfilesByUsuario(usuarioId);

    res.status(200).json({
      usuario_id: usuarioId,
      total: perfiles.length,
      data: perfiles
    });
  } catch (error: any) {
    console.error('Error en listarPerfilesDeUsuario:', error);
    res.status(500).json({ error: 'Error al listar perfiles del usuario' });
  }
};

/**
 * GET /api/perfiles/:perfil_id/usuarios
 * Listar usuarios activos con un perfil específico
 */
export const listarUsuariosConPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);

    if (isNaN(perfilId)) {
      res.status(400).json({ error: 'ID de perfil inválido' });
      return;
    }

    const usuarios = await UsuarioPerfil.getUsuariosByPerfil(perfilId);

    res.status(200).json({
      perfil_id: perfilId,
      total: usuarios.length,
      data: usuarios
    });
  } catch (error: any) {
    console.error('Error en listarUsuariosConPerfil:', error);
    res.status(500).json({ error: 'Error al listar usuarios con este perfil' });
  }
};

/**
 * GET /api/usuario-perfiles
 * Listar todas las asignaciones con filtros
 * Query params: ?usuario_id=1&perfil_id=2&activo=true
 */
export const listarTodasAsignaciones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.usuario_id) {
      filters.usuario_id = Number(req.query.usuario_id);
    }

    if (req.query.perfil_id) {
      filters.perfil_id = Number(req.query.perfil_id);
    }

    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    const asignaciones = await UsuarioPerfil.getAll(filters);

    res.status(200).json({
      total: asignaciones.length,
      filtros_aplicados: filters,
      data: asignaciones
    });
  } catch (error: any) {
    console.error('Error en listarTodasAsignaciones:', error);
    res.status(500).json({ error: 'Error al listar asignaciones' });
  }
};

/**
 * POST /api/usuarios/:usuario_id/perfiles
 * Asignar perfil a usuario (o reactivar)
 * Body: { "perfil_id": 2 }
 */
export const asignarPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuario_id);
    const { perfil_id } = req.body;

    // Validaciones
    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    if (!perfil_id || isNaN(Number(perfil_id))) {
      res.status(400).json({ error: 'perfil_id es obligatorio y debe ser numérico' });
      return;
    }

    const result = await UsuarioPerfil.assign(
      usuarioId,
      Number(perfil_id),
      getAuditoriaContext(req)
    );

    const perfiles = await UsuarioPerfil.getPerfilesByUsuario(usuarioId);

    if (result.created) {
      res.status(201).json({
        mensaje: 'Perfil asignado exitosamente',
        usuario_id: usuarioId,
        perfil_id: Number(perfil_id),
        perfiles_actuales: perfiles
      });
    } else if (result.reactivated) {
      res.status(200).json({
        mensaje: 'Perfil reactivado exitosamente',
        usuario_id: usuarioId,
        perfil_id: Number(perfil_id),
        perfiles_actuales: perfiles
      });
    }

    console.log(
      `✅ USUARIO-PERFIL: Asignado perfil_id=${perfil_id} a usuario_id=${usuarioId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en asignarPerfil:', error);

    if (
      error.message === 'Usuario no encontrado o inactivo' ||
      error.message === 'Perfil no encontrado o inactivo'
    ) {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El perfil ya está asignado al usuario') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al asignar perfil' });
    }
  }
};

/**
 * DELETE /api/usuarios/:usuario_id/perfiles/:perfil_id
 * Remover perfil de usuario (soft delete)
 */
export const removerPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuario_id);
    const perfilId = Number(req.params.perfil_id);

    // Validaciones
    if (isNaN(usuarioId) || isNaN(perfilId)) {
      res.status(400).json({ error: 'IDs inválidos' });
      return;
    }

    const removed = await UsuarioPerfil.remove(
      usuarioId,
      perfilId,
      getAuditoriaContext(req)
    );

    if (!removed) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    const perfiles = await UsuarioPerfil.getPerfilesByUsuario(usuarioId);

    res.status(200).json({
      mensaje: 'Perfil removido exitosamente',
      usuario_id: usuarioId,
      perfil_id: perfilId,
      perfiles_actuales: perfiles
    });

    console.log(
      `✅ USUARIO-PERFIL: Removido perfil_id=${perfilId} de usuario_id=${usuarioId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en removerPerfil:', error);

    if (error.message === 'La asignación no existe o ya está inactiva') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al remover perfil' });
    }
  }
};

/**
 * DELETE /api/usuarios/:usuario_id/perfiles/:perfil_id/permanente
 * Eliminar asignación físicamente (hard delete)
 */
export const eliminarAsignacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuario_id);
    const perfilId = Number(req.params.perfil_id);

    // Validaciones
    if (isNaN(usuarioId) || isNaN(perfilId)) {
      res.status(400).json({ error: 'IDs inválidos' });
      return;
    }

    const deleted = await UsuarioPerfil.delete(
      usuarioId,
      perfilId,
      getAuditoriaContext(req)
    );

    if (!deleted) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    res.status(200).json({
      mensaje: 'Asignación eliminada permanentemente'
    });

    console.log(
      `✅ USUARIO-PERFIL: Eliminado permanentemente perfil_id=${perfilId} de usuario_id=${usuarioId}`
    );
  } catch (error: any) {
    console.error('Error en eliminarAsignacion:', error);

    if (error.message === 'La asignación no existe') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar asignación' });
    }
  }
};

/**
 * PUT /api/usuarios/:usuario_id/perfiles/sync
 * Sincronizar perfiles (reemplazar todos)
 * Body: { "perfil_ids": [1, 2, 3] }
 */
export const sincronizarPerfiles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuario_id);
    const { perfil_ids } = req.body;

    // Validaciones
    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    if (!Array.isArray(perfil_ids)) {
      res.status(400).json({ error: 'perfil_ids debe ser un array' });
      return;
    }

    // Validar que todos sean números
    const perfilIdsNumericos = perfil_ids.map(Number);
    if (perfilIdsNumericos.some(isNaN)) {
      res.status(400).json({ error: 'Todos los perfil_ids deben ser numéricos' });
      return;
    }

    await UsuarioPerfil.syncPerfiles(
      usuarioId,
      perfilIdsNumericos,
      getAuditoriaContext(req)
    );

    const perfilesActuales = await UsuarioPerfil.getPerfilesByUsuario(usuarioId);

    res.status(200).json({
      mensaje: 'Perfiles sincronizados exitosamente',
      usuario_id: usuarioId,
      total_perfiles: perfilesActuales.length,
      data: perfilesActuales
    });

    console.log(
      `✅ USUARIO-PERFIL: Sincronizados perfiles de usuario_id=${usuarioId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en sincronizarPerfiles:', error);
    res.status(500).json({ error: 'Error al sincronizar perfiles' });
  }
};

/**
 * GET /api/usuarios/:usuario_id/perfiles/historial
 * Obtener historial de auditoría de asignaciones de un usuario
 */
export const obtenerHistorialUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const usuarioId = Number(req.params.usuario_id);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const historial = await UsuarioPerfil.getHistorialByUsuario(usuarioId);

    res.status(200).json({
      usuario_id: usuarioId,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialUsuario:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

/**
 * GET /api/perfiles/:perfil_id/historial
 * Obtener historial de auditoría de asignaciones de un perfil
 */
export const obtenerHistorialPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const perfilId = Number(req.params.perfil_id);

    if (isNaN(perfilId)) {
      res.status(400).json({ error: 'ID de perfil inválido' });
      return;
    }

    const historial = await UsuarioPerfil.getHistorialByPerfil(perfilId);

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