// src/controller/permisos/rolPermisosController.ts
import { Request, Response } from 'express';
import { RolPermiso } from '../../models/permisos/RolPermiso';
import { invalidateRolePermissions } from '../../middewares/authorize'; // ⭐ NUEVO

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
 * GET /api/roles/:rol_id/permisos
 * Listar permisos activos de un rol
 */
export const listarPermisosDeRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolId = Number(req.params.rol_id);

    if (isNaN(rolId)) {
      res.status(400).json({ error: 'ID de rol inválido' });
      return;
    }

    const permisos = await RolPermiso.getPermisosByRol(rolId);

    res.status(200).json({
      rol_id: rolId,
      total: permisos.length,
      data: permisos
    });
  } catch (error: any) {
    console.error('Error en listarPermisosDeRol:', error);
    res.status(500).json({ error: 'Error al listar permisos del rol' });
  }
};

/**
 * GET /api/permisos/:permiso_id/roles
 * Listar roles activos que tienen un permiso específico
 */
export const listarRolesConPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoId = Number(req.params.permiso_id);

    if (isNaN(permisoId)) {
      res.status(400).json({ error: 'ID de permiso inválido' });
      return;
    }

    const roles = await RolPermiso.getRolesByPermiso(permisoId);

    res.status(200).json({
      permiso_id: permisoId,
      total: roles.length,
      data: roles
    });
  } catch (error: any) {
    console.error('Error en listarRolesConPermiso:', error);
    res.status(500).json({ error: 'Error al listar roles con este permiso' });
  }
};

/**
 * POST /api/roles/:rol_id/permisos
 * Asignar permiso a rol (o reactivar)
 * Body: { "permiso_id": 5 }
 */
export const asignarPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolId = Number(req.params.rol_id);
    const { permiso_id } = req.body;

    // Validaciones
    if (isNaN(rolId)) {
      res.status(400).json({ error: 'ID de rol inválido' });
      return;
    }

    if (!permiso_id || isNaN(Number(permiso_id))) {
      res.status(400).json({ error: 'permiso_id es obligatorio y debe ser numérico' });
      return;
    }

    const result = await RolPermiso.assign(
      rolId,
      Number(permiso_id),
      getAuditoriaContext(req)
    );

    // ⭐ INVALIDAR CACHÉ
    console.log(`[ASIGNAR-PERMISO] Invalidando caché para rol_id=${rolId}`);
    await invalidateRolePermissions(rolId);

    const permisos = await RolPermiso.getPermisosByRol(rolId);

    if (result.created) {
      res.status(201).json({
        mensaje: 'Permiso asignado exitosamente',
        rol_id: rolId,
        permiso_id: Number(permiso_id),
        permisos_actuales: permisos
      });
    } else if (result.reactivated) {
      res.status(200).json({
        mensaje: 'Permiso reactivado exitosamente',
        rol_id: rolId,
        permiso_id: Number(permiso_id),
        permisos_actuales: permisos
      });
    }

    console.log(
      `✓ ROL-PERMISO: Asignado permiso_id=${permiso_id} a rol_id=${rolId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en asignarPermiso:', error);

    if (
      error.message === 'Rol no encontrado o inactivo' ||
      error.message === 'Permiso no encontrado o inactivo'
    ) {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El permiso ya está asignado al rol') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al asignar permiso' });
    }
  }
};

/**
 * DELETE /api/roles/:rol_id/permisos/:permiso_id
 * Remover permiso de rol (soft delete)
 */
export const removerPermiso = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolId = Number(req.params.rol_id);
    const permisoId = Number(req.params.permiso_id);

    // Validaciones
    if (isNaN(rolId) || isNaN(permisoId)) {
      res.status(400).json({ error: 'IDs inválidos' });
      return;
    }

    const removed = await RolPermiso.remove(
      rolId,
      permisoId,
      getAuditoriaContext(req)
    );

    if (!removed) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    // ⭐ INVALIDAR CACHÉ
    console.log(`[REMOVER-PERMISO] Invalidando caché para rol_id=${rolId}`);
    await invalidateRolePermissions(rolId);

    const permisos = await RolPermiso.getPermisosByRol(rolId);

    res.status(200).json({
      mensaje: 'Permiso removido exitosamente',
      rol_id: rolId,
      permiso_id: permisoId,
      permisos_actuales: permisos
    });

    console.log(
      `✓ ROL-PERMISO: Removido permiso_id=${permisoId} de rol_id=${rolId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en removerPermiso:', error);

    if (error.message === 'La asignación no existe o ya está inactiva') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al remover permiso' });
    }
  }
};

/**
 * PUT /api/roles/:rol_id/permisos/sync
 * Sincronizar permisos (reemplazar todos)
 * Body: { "permiso_ids": [1, 2, 3, 5, 8] }
 */
export const sincronizarPermisos = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolId = Number(req.params.rol_id);
    const { permiso_ids } = req.body;

    // Validaciones
    if (isNaN(rolId)) {
      res.status(400).json({ error: 'ID de rol inválido' });
      return;
    }

    if (!Array.isArray(permiso_ids)) {
      res.status(400).json({ error: 'permiso_ids debe ser un array' });
      return;
    }

    // Validar que todos sean números
    const permisoIdsNumericos = permiso_ids.map(Number);
    if (permisoIdsNumericos.some(isNaN)) {
      res.status(400).json({ error: 'Todos los permiso_ids deben ser numéricos' });
      return;
    }

    await RolPermiso.syncPermisos(
      rolId,
      permisoIdsNumericos,
      getAuditoriaContext(req)
    );

    // ⭐ INVALIDAR CACHÉ
    console.log(`[SINCRONIZAR-PERMISOS] Invalidando caché para rol_id=${rolId}`);
    await invalidateRolePermissions(rolId);

    const permisosActuales = await RolPermiso.getPermisosByRol(rolId);

    res.status(200).json({
      mensaje: 'Permisos sincronizados exitosamente',
      rol_id: rolId,
      total_permisos: permisosActuales.length,
      data: permisosActuales
    });

    console.log(
      `✓ ROL-PERMISO: Sincronizados permisos de rol_id=${rolId} por usuario_id=${req.user!.id}`
    );
  } catch (error: any) {
    console.error('Error en sincronizarPermisos:', error);
    res.status(500).json({ error: 'Error al sincronizar permisos' });
  }
};

/**
 * GET /api/roles/:rol_id/permisos/historial
 * Obtener historial de auditoría de asignaciones de un rol
 */
export const obtenerHistorialRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolId = Number(req.params.rol_id);

    if (isNaN(rolId)) {
      res.status(400).json({ error: 'ID de rol inválido' });
      return;
    }

    const historial = await RolPermiso.getHistorialByRol(rolId);

    res.status(200).json({
      rol_id: rolId,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialRol:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};