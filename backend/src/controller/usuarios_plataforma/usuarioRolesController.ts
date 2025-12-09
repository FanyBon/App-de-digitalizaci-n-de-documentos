// src/controller/usuarios_plataforma/usuarioRolesController.ts
import { Request, Response } from 'express';
import { UsuarioRol } from '../../models/usuarios_plataforma/UsuarioRol';

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
 * GET /api/usuarios/:id/roles
 * Listar roles activos de un usuario
 */
export const verRolesUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const roles = await UsuarioRol.listarRoles(usuarioId, false);

    res.status(200).json({
      usuario_id: usuarioId,
      total: roles.length,
      roles
    });
  } catch (error: any) {
    console.error('Error en verRolesUsuario:', error);
    res.status(500).json({ error: 'Error al obtener roles del usuario' });
  }
};

/**
 * GET /api/usuarios/:id/roles/historial
 * Ver historial completo de roles (incluyendo removidos)
 */
export const verHistorialRolesUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const historial = await UsuarioRol.obtenerHistorial(usuarioId);

    res.status(200).json({
      usuario_id: usuarioId,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en verHistorialRolesUsuario:', error);
    res.status(500).json({ error: 'Error al obtener historial de roles' });
  }
};

/**
 * POST /api/usuarios/:id/roles
 * Asignar un rol a un usuario
 */
export const asignarRolUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id);
    const { rolId } = req.body;

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    if (!rolId || isNaN(Number(rolId))) {
      res.status(400).json({ error: 'rolId es requerido y debe ser un número' });
      return;
    }

    await UsuarioRol.asignarRol(usuarioId, Number(rolId), getAuditoriaContext(req));

    const rolesActualizados = await UsuarioRol.listarRoles(usuarioId, false);

    res.status(200).json({
      mensaje: 'Rol asignado exitosamente',
      usuario_id: usuarioId,
      total: rolesActualizados.length,
      roles: rolesActualizados
    });

    console.log(`✅ USUARIO_ROL: Asignado por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en asignarRolUsuario:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Rol no encontrado o inactivo') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El usuario ya tiene este rol asignado') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al asignar rol' });
    }
  }
};

/**
 * PUT /api/usuarios/:id/roles
 * Reemplazar todos los roles de un usuario
 */
export const editarRolesUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id);
    const { roles } = req.body;

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    if (!Array.isArray(roles)) {
      res.status(400).json({ error: 'Se requiere un array de roles' });
      return;
    }

    const rolesValidos = roles.every(r => typeof r === 'number' && !isNaN(r));
    if (!rolesValidos) {
      res.status(400).json({ error: 'Todos los roles deben ser números válidos' });
      return;
    }

    await UsuarioRol.reemplazarRoles(usuarioId, roles, getAuditoriaContext(req));

    const rolesActualizados = await UsuarioRol.listarRoles(usuarioId, false);

    res.status(200).json({
      mensaje: 'Roles actualizados exitosamente',
      usuario_id: usuarioId,
      total: rolesActualizados.length,
      roles: rolesActualizados
    });

    console.log(`✅ USUARIO_ROL: Roles actualizados por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en editarRolesUsuario:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Uno o más roles no existen o están inactivos') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar roles' });
    }
  }
};

/**
 * DELETE /api/usuarios/:id/roles/:rolId
 * Quitar un rol de un usuario (soft delete)
 */
export const quitarRolUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id);
    const rolId = Number(req.params.rolId);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    if (isNaN(rolId)) {
      res.status(400).json({ error: 'ID de rol inválido' });
      return;
    }

    await UsuarioRol.quitarRol(usuarioId, rolId, getAuditoriaContext(req));

    const rolesActualizados = await UsuarioRol.listarRoles(usuarioId, false);

    res.status(200).json({
      mensaje: 'Rol removido exitosamente',
      usuario_id: usuarioId,
      total: rolesActualizados.length,
      roles: rolesActualizados
    });

    console.log(`✅ USUARIO_ROL: Removido por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en quitarRolUsuario:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'Rol no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El usuario no tiene este rol asignado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El rol ya está inactivo para este usuario') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al quitar rol' });
    }
  }
};

/**
 * DELETE /api/usuarios/:id/roles/:rolId/permanente
 * Eliminar físicamente un rol de un usuario (hard delete)
 */
export const eliminarRolUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = Number(req.params.id);
    const rolId = Number(req.params.rolId);

    if (isNaN(usuarioId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    if (isNaN(rolId)) {
      res.status(400).json({ error: 'ID de rol inválido' });
      return;
    }

    await UsuarioRol.eliminarRol(usuarioId, rolId, getAuditoriaContext(req));

    const rolesActualizados = await UsuarioRol.listarRoles(usuarioId, false);

    res.status(200).json({
      mensaje: 'Rol eliminado permanentemente',
      usuario_id: usuarioId,
      total: rolesActualizados.length,
      roles: rolesActualizados
    });

    console.log(`✅ USUARIO_ROL: Eliminado permanentemente por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en eliminarRolUsuario:', error);

    if (error.message === 'La asignación no existe') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar rol' });
    }
  }
};