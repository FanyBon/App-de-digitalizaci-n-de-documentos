// src/controller/usuarios_plataforma/usuariosController.ts
import { Request, Response } from 'express';
import validator from 'validator';
import { Usuario } from '../../models/usuarios_plataforma/Usuario';

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
 * GET /api/usuarios
 * Listar todos los usuarios con filtros
 */
export const listarUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    if (req.query.empresa_id) {
      filters.empresa_id = Number(req.query.empresa_id);
    }

    if (req.query.ubicacion_id) {
      filters.ubicacion_id = Number(req.query.ubicacion_id);
    }

    if (req.query.activo !== undefined) {
      filters.activo = req.query.activo === 'true';
    }

    if (req.query.rol_id) {
      filters.rol_id = Number(req.query.rol_id);
    }

    if (req.query.perfil_id) {
      filters.perfil_id = Number(req.query.perfil_id);
    }

    // Si no es SuperAdmin, solo ver usuarios de su empresa
    if (!req.user!.roles.includes('supAdministrador')) {
      filters.empresa_id = req.user!.empresa_id;
    }

    const usuarios = await Usuario.getAll(filters);

    res.status(200).json({
      total: usuarios.length,
      data: usuarios
    });
  } catch (error: any) {
    console.error('Error en listarUsuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

/**
 * GET /api/usuarios/:id
 * Obtener usuario por ID con estadísticas
 */
export const obtenerUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const usuario = await Usuario.getById(id);

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Si no es SuperAdmin, solo puede ver usuarios de su empresa
    if (!req.user!.roles.includes('supAdministrador') && usuario.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: 'No tienes permiso para ver este usuario' });
      return;
    }

    const stats = await Usuario.getStats(id);

    res.status(200).json({
      ...usuario,
      stats
    });
  } catch (error: any) {
    console.error('Error en obtenerUsuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

/**
 * POST /api/usuarios
 * Crear nuevo usuario
 */
export const crearUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      nombre_usuario,
      password,
      empresa_id,
      ubicacion_id,
      roles = [],
      perfiles = []
    } = req.body;

    // Validaciones básicas
    if (!email || !nombre_usuario || !password || !empresa_id) {
      res.status(400).json({ 
        error: 'Campos obligatorios: email, nombre_usuario, password, empresa_id' 
      });
      return;
    }

    if (!validator.isEmail(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    // Si no es SuperAdmin, solo puede crear usuarios en su empresa
    if (!req.user!.roles.includes('supAdministrador') && empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: 'No puedes crear usuarios en otra empresa' });
      return;
    }

    // Validar roles
    if (!Array.isArray(roles)) {
      res.status(400).json({ error: 'roles debe ser un array' });
      return;
    }

    // Validar perfiles
    if (!Array.isArray(perfiles)) {
      res.status(400).json({ error: 'perfiles debe ser un array' });
      return;
    }

    const usuarioId = await Usuario.create(
      {
        email,
        nombre_usuario,
        password,
        empresa_id,
        ubicacion_id
      },
      roles,
      perfiles,
      getAuditoriaContext(req)
    );

    const usuarioCreado = await Usuario.getById(usuarioId);

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      data: usuarioCreado
    });

    console.log(`✅ USUARIO: Creado usuario_id=${usuarioId} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en crearUsuario:', error);

    if (error.message === 'El email ya está registrado') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'El nombre de usuario ya está en uso') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Empresa no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'La ubicación no pertenece a la empresa seleccionada') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
};

/**
 * PUT /api/usuarios/:id
 * Actualizar usuario completo (con roles y perfiles)
 */
export const editarUsuarioConRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const {
      email,
      nombre_usuario,
      password,
      empresa_id,
      ubicacion_id,
      roles,
      perfiles
    } = req.body;

    // Verificar que el usuario existe
    const usuarioExistente = await Usuario.getById(id);
    if (!usuarioExistente) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Si no es SuperAdmin, solo puede editar usuarios de su empresa
    if (!req.user!.roles.includes('supAdministrador') && usuarioExistente.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: 'No tienes permiso para editar este usuario' });
      return;
    }

    // Validar email si se proporciona
    if (email && !validator.isEmail(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    // Validar password si se proporciona
    if (password && password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const updated = await Usuario.update(
      id,
      {
        email,
        nombre_usuario,
        password,
        empresa_id,
        ubicacion_id
      },
      roles,
      perfiles,
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Usuario no encontrado o sin cambios' });
      return;
    }

    const usuarioActualizado = await Usuario.getById(id);

    res.status(200).json({
      mensaje: 'Usuario actualizado exitosamente',
      data: usuarioActualizado
    });

    console.log(`✅ USUARIO: Actualizado usuario_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en editarUsuarioConRoles:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El email ya está registrado') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'El nombre de usuario ya está en uso') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Empresa no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'La ubicación no pertenece a la empresa seleccionada') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }
};

/**
 * PATCH /api/usuarios/:id
 * Actualizar usuario parcial (sin roles ni perfiles)
 */
export const editarUsuarioParcial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { email, nombre_usuario, password, empresa_id, ubicacion_id } = req.body;

    // Verificar que el usuario existe
    const usuarioExistente = await Usuario.getById(id);
    if (!usuarioExistente) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Si no es SuperAdmin, solo puede editar usuarios de su empresa
    if (!req.user!.roles.includes('supAdministrador') && usuarioExistente.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: 'No tienes permiso para editar este usuario' });
      return;
    }

    // Validar email si se proporciona
    if (email && !validator.isEmail(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    // Validar password si se proporciona
    if (password && password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const updated = await Usuario.update(
      id,
      {
        email,
        nombre_usuario,
        password,
        empresa_id,
        ubicacion_id
      },
      undefined,
      undefined,
      getAuditoriaContext(req)
    );

    if (!updated) {
      res.status(404).json({ error: 'Usuario no encontrado o sin cambios' });
      return;
    }

    const usuarioActualizado = await Usuario.getById(id);

    res.status(200).json({
      mensaje: 'Usuario actualizado exitosamente',
      data: usuarioActualizado
    });

    console.log(`✅ USUARIO: Actualizado parcial usuario_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en editarUsuarioParcial:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message === 'El email ya está registrado') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'El nombre de usuario ya está en uso') {
      res.status(409).json({ error: error.message });
    } else if (error.message === 'Empresa no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Ubicación no encontrada o inactiva') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'La ubicación no pertenece a la empresa seleccionada') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }
};

/**
 * PATCH /api/usuarios/:id/status
 * Cambiar estado (activar/inactivar)
 */
export const cambiarEstatusUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { activo } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (typeof activo !== 'boolean') {
      res.status(400).json({ error: 'El campo activo debe ser un booleano' });
      return;
    }

    // Verificar que el usuario existe
    const usuarioExistente = await Usuario.getById(id);
    if (!usuarioExistente) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Si no es SuperAdmin, solo puede cambiar estado de usuarios de su empresa
    if (!req.user!.roles.includes('supAdministrador') && usuarioExistente.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: 'No tienes permiso para cambiar el estado de este usuario' });
      return;
    }

    const changed = await Usuario.changeStatus(id, activo, getAuditoriaContext(req));

    if (!changed) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const usuarioActualizado = await Usuario.getById(id);

    res.status(200).json({
      mensaje: `Usuario ${activo ? 'activado' : 'inactivado'} exitosamente`,
      data: usuarioActualizado
    });

    console.log(`✅ USUARIO: Estatus cambiado usuario_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

  } catch (error: any) {
    console.error('Error en cambiarEstatusUsuario:', error);

    if (error.message.includes('ya está')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('No se puede inactivar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar estado del usuario' });
    }
  }
};

/**
 * DELETE /api/usuarios/:id
 * Eliminar físicamente (solo SuperAdmin)
 */
export const eliminarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const deleted = await Usuario.delete(id, getAuditoriaContext(req));

    if (!deleted) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({
      mensaje: 'Usuario eliminado exitosamente'
    });

    console.log(`✅ USUARIO: Eliminado usuario_id=${id} por usuario_id=${req.user!.id}`);

  } catch (error: any) {
    console.error('Error en eliminarUsuario:', error);

    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('No se puede eliminar')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  }
};

/**
 * GET /api/usuarios/:id/historial
 * Obtener historial de auditoría
 */
export const obtenerHistorialUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    // Verificar que el usuario existe
    const usuario = await Usuario.getById(id);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Si no es SuperAdmin, solo puede ver historial de usuarios de su empresa
    if (!req.user!.roles.includes('supAdministrador') && usuario.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: 'No tienes permiso para ver el historial de este usuario' });
      return;
    }

    const historial = await Usuario.getHistorial(id);

    res.status(200).json({
      usuario_id: id,
      total_registros: historial.length,
      historial
    });
  } catch (error: any) {
    console.error('Error en obtenerHistorialUsuario:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// ========== FUNCIONES DE COMPATIBILIDAD (deprecadas) ==========

/**
 * @deprecated
 */
export const authorizeRole = (allowedRoles: string[]) =>
  (req: Request, res: Response, next: any): void => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'No tienes permiso para ver usuarios' });
      return;
    }
    next();
  };