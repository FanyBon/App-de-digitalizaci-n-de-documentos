// src/models/usuarios_plataforma/Usuario.ts
import bcrypt from 'bcrypt';
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface UsuarioData {
  id?: number;
  email: string;
  nombre_usuario: string;
  password?: string;
  empresa_id: number;
  ubicacion_id?: number | null;
  activo?: boolean;
  sincronizado?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UsuarioDetallado extends UsuarioData {
  empresa_nombre?: string;
  ubicacion_nombre?: string;
  roles?: Array<{ id: number; nombre: string }>;
  perfiles?: Array<{ id: number; nombre: string }>;
  total_sesiones_creadas?: number;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Usuario {
  /**
   * Listar todos los usuarios con filtros
   */
  static async getAll(filters?: {
    empresa_id?: number;
    ubicacion_id?: number;
    activo?: boolean;
    rol_id?: number;
    perfil_id?: number;
  }): Promise<UsuarioDetallado[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        u.id,
        u.email,
        u.nombre_usuario,
        u.empresa_id,
        u.ubicacion_id,
        u.activo,
        u.sincronizado,
        u.created_at,
        u.updated_at,
        e.nombre AS empresa_nombre,
        ub.nombre AS ubicacion_nombre
      FROM usuarios u
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN ubicaciones ub ON u.ubicacion_id = ub.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.empresa_id) {
      query += ' AND u.empresa_id = ?';
      params.push(filters.empresa_id);
    }

    if (filters?.ubicacion_id) {
      query += ' AND u.ubicacion_id = ?';
      params.push(filters.ubicacion_id);
    }

    if (filters?.activo !== undefined) {
      query += ' AND u.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    if (filters?.rol_id) {
      query += ' AND EXISTS (SELECT 1 FROM usuario_roles ur WHERE ur.usuario_id = u.id AND ur.rol_id = ?)';
      params.push(filters.rol_id);
    }

    if (filters?.perfil_id) {
      query += ' AND EXISTS (SELECT 1 FROM usuario_perfiles up WHERE up.usuario_id = u.id AND up.perfil_id = ?)';
      params.push(filters.perfil_id);
    }

    query += ' ORDER BY u.nombre_usuario ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Cargar roles y perfiles para cada usuario
    const usuarios: UsuarioDetallado[] = [];
    for (const row of rows) {
      const roles = await this.getRolesByUserId(row.id);
      const perfiles = await this.getPerfilesByUserId(row.id);
      
      usuarios.push({
        ...this.mapRowToUsuario(row),
        roles,
        perfiles
      });
    }

    return usuarios;
  }

  /**
   * Obtener usuario por ID con información completa
   */
  static async getById(id: number): Promise<UsuarioDetallado | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        u.id,
        u.email,
        u.nombre_usuario,
        u.empresa_id,
        u.ubicacion_id,
        u.activo,
        u.sincronizado,
        u.created_at,
        u.updated_at,
        e.nombre AS empresa_nombre,
        ub.nombre AS ubicacion_nombre,
        (SELECT COUNT(*) FROM sesiones s 
         INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id 
         WHERE pv.creado_por = u.id) AS total_sesiones_creadas
      FROM usuarios u
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN ubicaciones ub ON u.ubicacion_id = ub.id
      WHERE u.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    const usuario = this.mapRowToUsuario(rows[0]);
    const roles = await this.getRolesByUserId(id);
    const perfiles = await this.getPerfilesByUserId(id);

    return {
      ...usuario,
      roles,
      perfiles,
      total_sesiones_creadas: rows[0].total_sesiones_creadas
    };
  }

  /**
   * Crear nuevo usuario
   */
  static async create(
    data: UsuarioData,
    roles: number[],
    perfiles: number[],
    auditoria: AuditoriaContext
  ): Promise<number> {
    const conn = await getPool('local').getConnection();

    try {
      await conn.beginTransaction();

      // 1. Validar email único
      const [existente] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM usuarios WHERE email = ?',
        [data.email]
      );

      if (existente.length > 0) {
        throw new Error('El email ya está registrado');
      }

      // 2. Validar nombre_usuario único
      const [existenteNombre] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM usuarios WHERE nombre_usuario = ?',
        [data.nombre_usuario]
      );

      if (existenteNombre.length > 0) {
        throw new Error('El nombre de usuario ya está en uso');
      }

      // 3. Validar que la empresa exista
      const [empresaRows] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM empresas WHERE id = ? AND estatus = "activo"',
        [data.empresa_id]
      );

      if (empresaRows.length === 0) {
        throw new Error('Empresa no encontrada o inactiva');
      }

      // 4. Validar ubicación si se proporciona
      if (data.ubicacion_id) {
        const [ubicacionRows] = await conn.query<RowDataPacket[]>(
          'SELECT id, empresa_id FROM ubicaciones WHERE id = ? AND activo = 1',
          [data.ubicacion_id]
        );

        if (ubicacionRows.length === 0) {
          throw new Error('Ubicación no encontrada o inactiva');
        }

        if (ubicacionRows[0].empresa_id !== data.empresa_id) {
          throw new Error('La ubicación no pertenece a la empresa seleccionada');
        }
      }

      // 5. Hash del password
      const hashedPassword = await bcrypt.hash(data.password!, 10);

      // 6. Insertar usuario
      const [result] = await conn.query<ResultSetHeader>(
        `
        INSERT INTO usuarios (
          email, nombre_usuario, password, empresa_id, ubicacion_id,
          activo, sincronizado, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          data.email,
          data.nombre_usuario,
          hashedPassword,
          data.empresa_id,
          data.ubicacion_id || null,
          data.activo !== false ? 1 : 0,
          data.sincronizado || 0
        ]
      );

      const usuarioId = result.insertId;

      // 7. Asignar roles
      if (roles && roles.length > 0) {
        const rolesValues = roles.map(rolId => [usuarioId, rolId, new Date()]);
        await conn.query(
          'INSERT INTO usuario_roles (usuario_id, rol_id, assigned_at) VALUES ?',
          [rolesValues]
        );
      }

      // 8. Asignar perfiles
      if (perfiles && perfiles.length > 0) {
        const perfilesValues = perfiles.map(perfilId => [usuarioId, perfilId, new Date()]);
        await conn.query(
          'INSERT INTO usuario_perfiles (usuario_id, perfil_id, assigned_at) VALUES ?',
          [perfilesValues]
        );
      }

      await conn.commit();

      console.log(`USUARIO: Creado usuario_id=${usuarioId} email="${data.email}"`);

      // 9. Registrar en auditoría
      await AuditoriaService.registrar({
        tabla: 'usuarios',
        registro_id: usuarioId,
        accion: 'CREATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_nuevos: {
          email: data.email,
          nombre_usuario: data.nombre_usuario,
          empresa_id: data.empresa_id,
          ubicacion_id: data.ubicacion_id,
          roles,
          perfiles
        },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });

      return usuarioId;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Actualizar usuario
   */
  static async update(
    id: number,
    data: Partial<UsuarioData>,
    roles?: number[],
    perfiles?: number[],
    auditoria?: AuditoriaContext
  ): Promise<boolean> {
    const conn = await getPool('local').getConnection();

    try {
      await conn.beginTransaction();

      // 1. Obtener usuario anterior
      const usuarioAnterior = await this.getById(id);
      if (!usuarioAnterior) {
        throw new Error('Usuario no encontrado');
      }

      // 2. Validar email único
      if (data.email && data.email !== usuarioAnterior.email) {
        const [existente] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM usuarios WHERE email = ? AND id != ?',
          [data.email, id]
        );

        if (existente.length > 0) {
          throw new Error('El email ya está registrado');
        }
      }

      // 3. Validar nombre_usuario único
      if (data.nombre_usuario && data.nombre_usuario !== usuarioAnterior.nombre_usuario) {
        const [existenteNombre] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM usuarios WHERE nombre_usuario = ? AND id != ?',
          [data.nombre_usuario, id]
        );

        if (existenteNombre.length > 0) {
          throw new Error('El nombre de usuario ya está en uso');
        }
      }

      // 4. Validar empresa si se proporciona
      if (data.empresa_id !== undefined) {
        const [empresaRows] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM empresas WHERE id = ? AND estatus = "activo"',
          [data.empresa_id]
        );

        if (empresaRows.length === 0) {
          throw new Error('Empresa no encontrada o inactiva');
        }
      }

      // 5. Validar ubicación si se proporciona
      if (data.ubicacion_id !== undefined && data.ubicacion_id !== null) {
        const empresaId = data.empresa_id || usuarioAnterior.empresa_id;
        
        const [ubicacionRows] = await conn.query<RowDataPacket[]>(
          'SELECT id, empresa_id FROM ubicaciones WHERE id = ? AND activo = 1',
          [data.ubicacion_id]
        );

        if (ubicacionRows.length === 0) {
          throw new Error('Ubicación no encontrada o inactiva');
        }

        if (ubicacionRows[0].empresa_id !== empresaId) {
          throw new Error('La ubicación no pertenece a la empresa seleccionada');
        }
      }

      // 6. Construir query dinámicamente
      const updates: string[] = [];
      const params: any[] = [];

      if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email);
      }
      if (data.nombre_usuario !== undefined) {
        updates.push('nombre_usuario = ?');
        params.push(data.nombre_usuario);
      }
      if (data.password !== undefined) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        updates.push('password = ?');
        params.push(hashedPassword);
      }
      if (data.empresa_id !== undefined) {
        updates.push('empresa_id = ?');
        params.push(data.empresa_id);
      }
      if (data.ubicacion_id !== undefined) {
        updates.push('ubicacion_id = ?');
        params.push(data.ubicacion_id);
      }
      if (data.activo !== undefined) {
        updates.push('activo = ?');
        params.push(data.activo ? 1 : 0);
      }

      // 7. Ejecutar UPDATE si hay cambios
      if (updates.length > 0) {
        params.push(id);
        const [result] = await conn.query<ResultSetHeader>(
          `UPDATE usuarios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );

        if (result.affectedRows === 0) {
          throw new Error('Usuario no encontrado');
        }
      }

      // 8. Sincronizar roles si se proporcionan
      if (Array.isArray(roles)) {
        await conn.query('DELETE FROM usuario_roles WHERE usuario_id = ?', [id]);
        if (roles.length > 0) {
          const rolesValues = roles.map(rolId => [id, rolId, new Date()]);
          await conn.query(
            'INSERT INTO usuario_roles (usuario_id, rol_id, assigned_at) VALUES ?',
            [rolesValues]
          );
        }
      }

      // 9. Sincronizar perfiles si se proporcionan
      if (Array.isArray(perfiles)) {
        await conn.query('DELETE FROM usuario_perfiles WHERE usuario_id = ?', [id]);
        if (perfiles.length > 0) {
          const perfilesValues = perfiles.map(perfilId => [id, perfilId, new Date()]);
          await conn.query(
            'INSERT INTO usuario_perfiles (usuario_id, perfil_id, assigned_at) VALUES ?',
            [perfilesValues]
          );
        }
      }

      await conn.commit();

      console.log(`USUARIO: Actualizado usuario_id=${id}`);

      // 10. Registrar en auditoría si se proporciona contexto
      if (auditoria) {
        await AuditoriaService.registrar({
          tabla: 'usuarios',
          registro_id: id,
          accion: 'UPDATE',
          usuario_id: auditoria.usuario_id,
          usuario_nombre: auditoria.usuario_nombre,
          datos_anteriores: {
            email: usuarioAnterior.email,
            nombre_usuario: usuarioAnterior.nombre_usuario,
            empresa_id: usuarioAnterior.empresa_id,
            ubicacion_id: usuarioAnterior.ubicacion_id,
            activo: usuarioAnterior.activo,
            roles: usuarioAnterior.roles?.map(r => r.id),
            perfiles: usuarioAnterior.perfiles?.map(p => p.id)
          },
          datos_nuevos: {
            ...data,
            roles,
            perfiles
          },
          ip_address: auditoria.ip,
          user_agent: auditoria.user_agent
        });
      }

      return true;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Cambiar estado (soft delete)
   */
  static async changeStatus(
    id: number,
    activo: boolean,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    const usuarioAnterior = await this.getById(id);
    if (!usuarioAnterior) {
      throw new Error('Usuario no encontrado');
    }

    if (usuarioAnterior.activo === activo) {
      throw new Error(`El usuario ya está ${activo ? 'activo' : 'inactivo'}`);
    }

    // Validar si es el único SuperAdmin activo
    if (!activo) {
      const [superAdminRows] = await pool.query<RowDataPacket[]>(
        `
        SELECT COUNT(*) as count 
        FROM usuarios u
        INNER JOIN usuario_roles ur ON u.id = ur.usuario_id
        INNER JOIN roles r ON ur.rol_id = r.id
        WHERE r.nombre = 'supAdministrador' AND u.activo = 1
        `
      );

      if (superAdminRows[0].count === 1) {
        // Verificar si este usuario es el único SuperAdmin
        const [esSuper] = await pool.query<RowDataPacket[]>(
          `
          SELECT 1 
          FROM usuario_roles ur
          INNER JOIN roles r ON ur.rol_id = r.id
          WHERE ur.usuario_id = ? AND r.nombre = 'supAdministrador'
          `,
          [id]
        );

        if (esSuper.length > 0) {
          throw new Error('No se puede inactivar el único SuperAdministrador del sistema');
        }
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE usuarios SET activo = ?, updated_at = NOW() WHERE id = ?',
      [activo ? 1 : 0, id]
    );

    console.log(`USUARIO: Cambio estado usuario_id=${id} a ${activo ? 'activo' : 'inactivo'}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'usuarios',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { activo: usuarioAnterior.activo },
        datos_nuevos: { activo },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente (solo SuperAdmin)
   */
  static async delete(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const conn = await getPool('local').getConnection();

    try {
      await conn.beginTransaction();

      const usuario = await this.getById(id);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Validar que no sea el único SuperAdmin
      const [superAdminRows] = await conn.query<RowDataPacket[]>(
        `
        SELECT COUNT(*) as count 
        FROM usuarios u
        INNER JOIN usuario_roles ur ON u.id = ur.usuario_id
        INNER JOIN roles r ON ur.rol_id = r.id
        WHERE r.nombre = 'supAdministrador' AND u.activo = 1
        `
      );

      if (superAdminRows[0].count === 1) {
        const [esSuper] = await conn.query<RowDataPacket[]>(
          `
          SELECT 1 
          FROM usuario_roles ur
          INNER JOIN roles r ON ur.rol_id = r.id
          WHERE ur.usuario_id = ? AND r.nombre = 'supAdministrador'
          `,
          [id]
        );

        if (esSuper.length > 0) {
          throw new Error('No se puede eliminar el único SuperAdministrador del sistema');
        }
      }

      // Validar que no tenga PDVs creados
      if (usuario.total_sesiones_creadas! > 0) {
        throw new Error(`No se puede eliminar: el usuario ha creado ${usuario.total_sesiones_creadas} sesión(es)`);
      }

      // Eliminar roles
      await conn.query('DELETE FROM usuario_roles WHERE usuario_id = ?', [id]);

      // Eliminar perfiles
      await conn.query('DELETE FROM usuario_perfiles WHERE usuario_id = ?', [id]);

      // Eliminar usuario
      const [result] = await conn.query<ResultSetHeader>(
        'DELETE FROM usuarios WHERE id = ?',
        [id]
      );

      await conn.commit();

      console.log(`USUARIO: Eliminado usuario_id=${id}`);

      // Registrar en auditoría
      if (result.affectedRows > 0) {
        await AuditoriaService.registrar({
          tabla: 'usuarios',
          registro_id: id,
          accion: 'DELETE',
          usuario_id: auditoria.usuario_id,
          usuario_nombre: auditoria.usuario_nombre,
          datos_anteriores: usuario,
          datos_nuevos: null,
          ip_address: auditoria.ip,
          user_agent: auditoria.user_agent
        });
      }

      return result.affectedRows > 0;

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Obtener estadísticas de un usuario
   */
  static async getStats(id: number) {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM sesiones s 
         INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id 
         WHERE pv.creado_por = ?) AS total_sesiones_creadas,
        (SELECT COUNT(*) FROM sesiones s 
         INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id 
         WHERE pv.creado_por = ? AND s.activa = 1) AS sesiones_activas
      `,
      [id, id]
    );

    return rows[0];
  }

  /**
   * Obtener historial de auditoría
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('usuarios', id);
  }

  /**
   * Helper: Obtener roles de un usuario
   */
  private static async getRolesByUserId(usuarioId: number): Promise<Array<{ id: number; nombre: string }>> {
  const pool = getPool('local');
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT r.id, r.nombre
    FROM roles r
    INNER JOIN usuario_roles ur ON r.id = ur.rol_id
    WHERE ur.usuario_id = ?
    ORDER BY r.nombre
    `,
    [usuarioId]
  );
  return rows as Array<{ id: number; nombre: string }>;
}

  /**
   * Helper: Obtener perfiles de un usuario
   */
  private static async getPerfilesByUserId(usuarioId: number): Promise<Array<{ id: number; nombre: string }>> {
  const pool = getPool('local');
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT p.id, p.nombre
    FROM perfiles p
    INNER JOIN usuario_perfiles up ON p.id = up.perfil_id
    WHERE up.usuario_id = ?
    ORDER BY p.nombre
    `,
    [usuarioId]
  );
  return rows as Array<{ id: number; nombre: string }>;
}

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToUsuario(row: any): UsuarioDetallado {
    return {
      id: row.id,
      email: row.email,
      nombre_usuario: row.nombre_usuario,
      empresa_id: row.empresa_id,
      ubicacion_id: row.ubicacion_id,
      activo: !!row.activo,
      sincronizado: !!row.sincronizado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      empresa_nombre: row.empresa_nombre,
      ubicacion_nombre: row.ubicacion_nombre
    };
  }

  // ========== MÉTODOS DE COMPATIBILIDAD (para no romper código existente) ==========

  /**
   * @deprecated Use getAll() instead
   */
  static async listar(): Promise<any[]> {
    return this.getAll();
  }

  /**
   * @deprecated Use getAll({ empresa_id }) instead
   */
  static async listarPorEmpresa(empresa_id: number): Promise<any[]> {
    return this.getAll({ empresa_id });
  }

  /**
   * @deprecated Use create() instead
   */
  static async crear(
    email: string,
    nombre_usuario: string,
    password: string,
    empresa_id: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const usuarioId = await this.create(
        { email, nombre_usuario, password, empresa_id },
        [],
        [],
        { usuario_id: 1, usuario_nombre: 'system' }
      );
      return { success: true, data: { id: usuarioId, email, nombre_usuario, empresa_id } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * @deprecated Use update() instead
   */
  static async editarConRoles(
    id: number,
    campos: any
  ): Promise<{ success: boolean; data?: any; roles?: number[]; perfiles?: number[]; error?: string }> {
    try {
      await this.update(id, campos, campos.roles, campos.perfiles);
      return { success: true, data: campos, roles: campos.roles, perfiles: campos.perfiles };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * @deprecated Use delete() instead
   */
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.delete(id, { usuario_id: 1, usuario_nombre: 'system' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}