// src/models/permisos/PerfilModulo.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface PerfilModuloData {
  perfil_id: number;
  modulo_id: number;
  activo?: boolean;
  assigned_at?: Date;
  assigned_by?: number;
  assigned_ip?: string;
  removed_at?: Date | null;
  removed_by?: number | null;
  removed_ip?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface PerfilModuloDetallado extends PerfilModuloData {
  perfil_nombre?: string;
  modulo_codigo?: string;
  modulo_nombre?: string;
  modulo_ruta?: string;
  modulo_icono?: string;
  modulo_padre_id?: number | null;
  assigned_by_nombre?: string;
  removed_by_nombre?: string;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class PerfilModulo {
  /**
   * Listar todas las asignaciones con filtros
   */
  static async getAll(filters?: {
    perfil_id?: number;
    modulo_id?: number;
    activo?: boolean;
  }): Promise<PerfilModuloDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        pm.perfil_id,
        pm.modulo_id,
        pm.activo,
        pm.assigned_at,
        pm.assigned_by,
        pm.assigned_ip,
        pm.removed_at,
        pm.removed_by,
        pm.removed_ip,
        pm.created_at,
        pm.updated_at,
        p.nombre AS perfil_nombre,
        m.codigo AS modulo_codigo,
        m.nombre AS modulo_nombre,
        m.ruta AS modulo_ruta,
        m.icono AS modulo_icono,
        m.padre_id AS modulo_padre_id,
        ua.nombre_usuario AS assigned_by_nombre,
        ur.nombre_usuario AS removed_by_nombre
      FROM perfil_modulos pm
      INNER JOIN perfiles p ON pm.perfil_id = p.id
      INNER JOIN modulos_frontend m ON pm.modulo_id = m.id
      LEFT JOIN usuarios ua ON pm.assigned_by = ua.id
      LEFT JOIN usuarios ur ON pm.removed_by = ur.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.perfil_id !== undefined) {
      query += ' AND pm.perfil_id = ?';
      params.push(filters.perfil_id);
    }

    if (filters?.modulo_id !== undefined) {
      query += ' AND pm.modulo_id = ?';
      params.push(filters.modulo_id);
    }

    if (filters?.activo !== undefined) {
      query += ' AND pm.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    query += ' ORDER BY m.orden, pm.assigned_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToPerfilModulo(row));
  }

  /**
   * Listar módulos activos de un perfil
   */
  static async getModulosByPerfil(perfilId: number): Promise<PerfilModuloDetallado[]> {
    return this.getAll({ perfil_id: perfilId, activo: true });
  }

  /**
   * Listar perfiles activos que tienen un módulo
   */
  static async getPerfilesByModulo(moduloId: number): Promise<PerfilModuloDetallado[]> {
    return this.getAll({ modulo_id: moduloId, activo: true });
  }

  /**
   * Verificar si un perfil tiene acceso a un módulo específico
   */
  static async hasModulo(perfilId: number, moduloCodigo: string): Promise<boolean> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 
       FROM perfil_modulos pm
       INNER JOIN modulos_frontend m ON pm.modulo_id = m.id
       WHERE pm.perfil_id = ? 
         AND m.codigo = ? 
         AND pm.activo = 1 
         AND m.activo = 1`,
      [perfilId, moduloCodigo]
    );

    return rows.length > 0;
  }

  /**
   * Asignar módulo a perfil (o reactivar si existe inactivo)
   */
  static async assign(
    perfilId: number,
    moduloId: number,
    auditoria: AuditoriaContext
  ): Promise<{ created: boolean; reactivated: boolean }> {
    const pool = getPool('local');

    // Validar que perfil existe y está activo
    const [perfiles] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM perfiles WHERE id = ? AND activo = 1',
      [perfilId]
    );

    if (perfiles.length === 0) {
      throw new Error('Perfil no encontrado o inactivo');
    }

    // Validar que módulo existe y está activo
    const [modulos] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM modulos_frontend WHERE id = ? AND activo = 1',
      [moduloId]
    );

    if (modulos.length === 0) {
      throw new Error('Módulo no encontrado o inactivo');
    }

    // Verificar si ya existe la asignación
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT activo FROM perfil_modulos WHERE perfil_id = ? AND modulo_id = ?',
      [perfilId, moduloId]
    );

    let created = false;
    let reactivated = false;

    if (existing.length === 0) {
      // Crear nueva asignación
      await pool.query(
        `INSERT INTO perfil_modulos (
          perfil_id, modulo_id, activo, assigned_at, assigned_by, assigned_ip,
          created_at, updated_at
        ) VALUES (?, ?, 1, NOW(), ?, ?, NOW(), NOW())`,
        [perfilId, moduloId, auditoria.usuario_id, auditoria.ip]
      );

      created = true;

      console.log(`PERFIL-MODULO: Asignado modulo_id=${moduloId} a perfil_id=${perfilId}`);

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'perfil_modulos',
        registro_id: perfilId,
        accion: 'CREATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_nuevos: { perfil_id: perfilId, modulo_id: moduloId, activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    } else if (!existing[0].activo) {
      // Reactivar asignación existente
      await pool.query(
        `UPDATE perfil_modulos 
         SET activo = 1,
             assigned_at = NOW(),
             assigned_by = ?,
             assigned_ip = ?,
             removed_at = NULL,
             removed_by = NULL,
             removed_ip = NULL,
             updated_at = NOW()
         WHERE perfil_id = ? AND modulo_id = ?`,
        [auditoria.usuario_id, auditoria.ip, perfilId, moduloId]
      );

      reactivated = true;

      console.log(`PERFIL-MODULO: Reactivado modulo_id=${moduloId} para perfil_id=${perfilId}`);

      // Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'perfil_modulos',
        registro_id: perfilId,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: false },
        datos_nuevos: { activo: true },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    } else {
      throw new Error('El módulo ya está asignado al perfil');
    }

    return { created, reactivated };
  }

  /**
   * Remover módulo de perfil (soft delete)
   */
  static async remove(
    perfilId: number,
    moduloId: number,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Verificar que existe y está activo
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM perfil_modulos WHERE perfil_id = ? AND modulo_id = ? AND activo = 1',
      [perfilId, moduloId]
    );

    if (existing.length === 0) {
      throw new Error('La asignación no existe o ya está inactiva');
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE perfil_modulos
       SET activo = 0,
           removed_at = NOW(),
           removed_by = ?,
           removed_ip = ?,
           updated_at = NOW()
       WHERE perfil_id = ? AND modulo_id = ?`,
      [auditoria.usuario_id, auditoria.ip, perfilId, moduloId]
    );

    console.log(`PERFIL-MODULO: Removido modulo_id=${moduloId} de perfil_id=${perfilId}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'perfil_modulos',
        registro_id: perfilId,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: true },
        datos_nuevos: { activo: false },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Sincronizar módulos de un perfil (reemplazar todos)
   */
  static async syncModulos(
    perfilId: number,
    moduloIds: number[],
    auditoria: AuditoriaContext
  ): Promise<void> {
    const pool = getPool('local');

    // Obtener módulos actuales activos
    const modulosActuales = await this.getModulosByPerfil(perfilId);
    const modulosActualesIds = modulosActuales.map(m => m.modulo_id);

    // Módulos a agregar (nuevos)
    const modulosToAdd = moduloIds.filter(id => !modulosActualesIds.includes(id));

    // Módulos a remover (ya no están en la lista)
    const modulosToRemove = modulosActualesIds.filter(id => !moduloIds.includes(id));

    // Agregar nuevos
    for (const moduloId of modulosToAdd) {
      await this.assign(perfilId, moduloId, auditoria);
    }

    // Remover los que ya no están
    for (const moduloId of modulosToRemove) {
      await this.remove(perfilId, moduloId, auditoria);
    }

    console.log(
      `PERFIL-MODULO: Sincronizado perfil_id=${perfilId} - Agregados: ${modulosToAdd.length}, Removidos: ${modulosToRemove.length}`
    );
  }

  /**
   * Obtener historial de auditoría de un perfil
   */
  static async getHistorialByPerfil(perfilId: number) {
    return AuditoriaService.getHistorial('perfil_modulos', perfilId);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToPerfilModulo(row: any): PerfilModuloDetallado {
    return {
      perfil_id: row.perfil_id,
      modulo_id: row.modulo_id,
      activo: !!row.activo,
      assigned_at: row.assigned_at,
      assigned_by: row.assigned_by,
      assigned_ip: row.assigned_ip,
      removed_at: row.removed_at,
      removed_by: row.removed_by,
      removed_ip: row.removed_ip,
      created_at: row.created_at,
      updated_at: row.updated_at,
      perfil_nombre: row.perfil_nombre,
      modulo_codigo: row.modulo_codigo,
      modulo_nombre: row.modulo_nombre,
      modulo_ruta: row.modulo_ruta,
      modulo_icono: row.modulo_icono,
      modulo_padre_id: row.modulo_padre_id,
      assigned_by_nombre: row.assigned_by_nombre,
      removed_by_nombre: row.removed_by_nombre
    };
  }
}
