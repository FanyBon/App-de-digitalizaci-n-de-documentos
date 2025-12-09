// src/middlewares/authorize.ts
import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { getPool } from '../config/db_controlcomidas';
import NodeCache from 'node-cache';
import { RowDataPacket } from 'mysql2';

// Cache de permisos (TTL de 60 segundos)
const cache = new NodeCache({ stdTTL: 60 });

// No necesitamos redefinir AuthenticatedRequest porque Request ya tiene user?: AuthPayload
// gracias a la declaración global en authMiddleware.ts

/**
 * Middleware de autorización dinámica
 * 
 * Valida que el usuario tenga el permiso necesario para acceder a un recurso
 * 
 * Soporta DOS formatos de llamada:
 * 1. authorize('empresas.listar')           - Código completo (formato anterior)
 * 2. authorize('empresas', 'listar')        - Recurso y acción separados (formato nuevo)
 * 
 * @param resource - Nombre del recurso (ej: 'empleados') o código completo del permiso (ej: 'empresas.listar')
 * @param action - (Opcional) Acción a realizar (ej: 'crear', 'editar', 'eliminar')
 * 
 * @example
 * // Formato anterior (1 parámetro) - usado en empresas
 * router.get('/empresas', verifyToken, authorize('empresas.listar'), listar);
 * 
 * // Formato nuevo (2 parámetros) - usado en empleados
 * router.post('/empleados', verifyToken, authorize('empleados', 'crear'), crearEmpleado);
 */
export const authorize = (resource: string, action?: string) => {
  // Si 'action' está presente, construir el código como: recurso.accion
  // Si no, asumir que 'resource' ya es el código completo (ej: 'empresas.listar')
  const codigoPermiso = action ? `${resource}.${action}` : resource;

  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    // Verificar que el usuario esté autenticado
    if (!user) {
      return next(new createError.Unauthorized('No autenticado'));
    }

    // Verificar que el usuario tenga roles asignados
    if (!user.roles || user.roles.length === 0) {
      console.warn(`⚠️ Usuario ${user.id} sin roles asignados`);
      return next(new createError.Forbidden('No tienes roles asignados'));
    }

    // Intentar obtener del cache
    const cacheKey = `perms:user:${user.id}`;
    const cached = cache.get<Record<string, boolean>>(cacheKey);

    if (cached && cached[codigoPermiso]) {
      console.log(`✅ [CACHE] Usuario ${user.nombre_usuario} tiene permiso: ${codigoPermiso}`);
      return next();
    }

    try {
      const pool = getPool('local');

      // Consulta: Verificar si alguno de los roles del usuario tiene el permiso
      const [rowsRoles] = await pool.query<RowDataPacket[]>(
        `SELECT 1 
         FROM permisos p
         INNER JOIN rol_permisos rp ON rp.permiso_id = p.id AND rp.activo = 1
         INNER JOIN roles r ON r.id = rp.rol_id AND r.activo = 1
         WHERE r.nombre IN (?) 
         AND p.codigo = ? 
         AND p.activo = 1
         LIMIT 1`,
        [user.roles, codigoPermiso]
      );

      // Si se encontró el permiso en roles
      if (rowsRoles.length > 0) {
        console.log(`✅ Usuario ${user.nombre_usuario} tiene permiso: ${codigoPermiso} (vía roles)`);

        // Guardar en cache
        const userPerms = cached || {};
        userPerms[codigoPermiso] = true;
        cache.set(cacheKey, userPerms);

        return next();
      }

      // Si no se encontró el permiso, denegar acceso
      console.warn(
        `⛔ ACCESO DENEGADO - Usuario: ${user.nombre_usuario}, ` +
        `Roles: [${user.roles.join(', ')}], ` +
        `Permiso requerido: ${codigoPermiso}`
      );

      return next(
        new createError.Forbidden(
          `No tienes permiso para realizar esta acción. Permiso requerido: ${codigoPermiso}`
        )
      );
    } catch (error) {
      console.error('❌ Error en middleware de autorización:', error);
      return next(new createError.InternalServerError('Error al verificar permisos'));
    }
  };
};

/**
 * Middleware para validar múltiples permisos (requiere AL MENOS UNO)
 * 
 * @param permissions - Array de códigos de permisos ['empleados.crear', 'empleados.editar']
 * 
 * @example
 * router.get('/dashboard', verifyToken, authorizeAny(['dashboard.ver', 'admin.acceso']), getDashboard);
 */
export const authorizeAny = (permissions: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new createError.Unauthorized('No autenticado'));
    }

    if (!user.roles || user.roles.length === 0) {
      console.warn(`⚠️ Usuario ${user.id} sin roles asignados`);
      return next(new createError.Forbidden('No tienes roles asignados'));
    }

    try {
      const pool = getPool('local');

      // Consulta: Verificar si el usuario tiene AL MENOS UNO de los permisos
      const [rowsRoles] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT p.codigo
         FROM permisos p
         INNER JOIN rol_permisos rp ON rp.permiso_id = p.id AND rp.activo = 1
         INNER JOIN roles r ON r.id = rp.rol_id AND r.activo = 1
         WHERE r.nombre IN (?) 
         AND p.codigo IN (?)
         AND p.activo = 1
         LIMIT 1`,
        [user.roles, permissions]
      );

      if (rowsRoles.length > 0) {
        console.log(
          `✅ Usuario ${user.nombre_usuario} tiene permiso: ${rowsRoles[0].codigo} ` +
          `(de: [${permissions.join(', ')}])`
        );
        return next();
      }

      console.warn(
        `⛔ ACCESO DENEGADO - Usuario: ${user.nombre_usuario}, ` +
        `Roles: [${user.roles.join(', ')}], ` +
        `Permisos requeridos (al menos uno): [${permissions.join(', ')}]`
      );

      return next(
        new createError.Forbidden(
          `No tienes ninguno de los permisos requeridos: ${permissions.join(', ')}`
        )
      );
    } catch (error) {
      console.error('❌ Error en middleware authorizeAny:', error);
      return next(new createError.InternalServerError('Error al verificar permisos'));
    }
  };
};

/**
 * Middleware para validar múltiples permisos (requiere TODOS)
 * 
 * @param permissions - Array de códigos de permisos ['empleados.crear', 'empleados.editar']
 * 
 * @example
 * router.post('/admin-action', verifyToken, authorizeAll(['admin.acceso', 'usuarios.gestionar']), adminAction);
 */
export const authorizeAll = (permissions: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new createError.Unauthorized('No autenticado'));
    }

    if (!user.roles || user.roles.length === 0) {
      console.warn(`⚠️ Usuario ${user.id} sin roles asignados`);
      return next(new createError.Forbidden('No tienes roles asignados'));
    }

    try {
      const pool = getPool('local');

      // Consulta: Verificar si el usuario tiene TODOS los permisos
      const [rowsRoles] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT p.codigo
         FROM permisos p
         INNER JOIN rol_permisos rp ON rp.permiso_id = p.id AND rp.activo = 1
         INNER JOIN roles r ON r.id = rp.rol_id AND r.activo = 1
         WHERE r.nombre IN (?) 
         AND p.codigo IN (?)
         AND p.activo = 1`,
        [user.roles, permissions]
      );

      const permisosEncontrados = rowsRoles.map((row: any) => row.codigo);

      // Verificar que tenga TODOS los permisos requeridos
      const tieneTodos = permissions.every(p => permisosEncontrados.includes(p));

      if (tieneTodos) {
        console.log(
          `✅ Usuario ${user.nombre_usuario} tiene TODOS los permisos: [${permissions.join(', ')}]`
        );
        return next();
      }

      const permisosFaltantes = permissions.filter(p => !permisosEncontrados.includes(p));

      console.warn(
        `⛔ ACCESO DENEGADO - Usuario: ${user.nombre_usuario}, ` +
        `Roles: [${user.roles.join(', ')}], ` +
        `Permisos faltantes: [${permisosFaltantes.join(', ')}]`
      );

      return next(
        new createError.Forbidden(
          `Te faltan permisos: ${permisosFaltantes.join(', ')}`
        )
      );
    } catch (error) {
      console.error('❌ Error en middleware authorizeAll:', error);
      return next(new createError.InternalServerError('Error al verificar permisos'));
    }
  };
};

// ====================================
// FUNCIONES DE INVALIDACIÓN DE CACHÉ
// ====================================

/**
 * Invalidar caché de permisos de un usuario específico
 */
export function invalidateUserPermissions(userId: number): void {
  const cacheKey = `perms:user:${userId}`;
  const deleted = cache.del(cacheKey);
  
  if (deleted) {
    console.log(`✅ [CACHE] Permisos invalidados para usuario ${userId}`);
  } else {
    console.log(`ℹ️ [CACHE] No había caché para usuario ${userId}`);
  }
}

/**
 * Invalidar caché de TODOS los usuarios que tienen un rol específico
 */
export async function invalidateRolePermissions(rolId: number): Promise<void> {
  try {
    const pool = getPool('local');
    
    // Obtener todos los usuarios con este rol
    const [usuarios] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT usuario_id 
       FROM usuario_roles 
       WHERE rol_id = ? AND activo = 1`,
      [rolId]
    );

    // Invalidar caché de cada usuario
    let invalidatedCount = 0;
    usuarios.forEach((u: any) => {
      const cacheKey = `perms:user:${u.usuario_id}`;
      if (cache.del(cacheKey)) {
        invalidatedCount++;
      }
    });

    console.log(
      `✅ [CACHE] Permisos invalidados para ${invalidatedCount} usuarios del rol ${rolId}`
    );

  } catch (error) {
    console.error('❌ [CACHE] Error al invalidar permisos:', error);
  }
}

/**
 * Invalidar caché de TODOS los usuarios
 */
export function invalidateAllPermissions(): void {
  const keysDeleted = cache.keys().length;
  cache.flushAll();
  console.log(`✅ [CACHE] Todos los permisos invalidados (${keysDeleted} usuarios)`);
}