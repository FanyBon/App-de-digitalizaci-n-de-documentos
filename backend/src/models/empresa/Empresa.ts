// src/models/empresa/Empresa.ts
import { getPool } from '../../config/db_controlcomidas';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuditoriaService } from '../../services/auditoriaService';

export interface EmpresaData {
  id?: number;
  parent_id?: number | null;
  nombre: string;
  contacto: string;
  telefono: string;
  costo_charola?: number;
  estimado_personas?: number;
  created_at?: Date;
  updated_at?: Date;
  sincronizado?: boolean;
  estatus?: 'activo' | 'inactivo' | 'suspendido';
}

export interface EmpresaDetallada extends EmpresaData {
  parent_nombre?: string;
  total_ubicaciones?: number;
  total_usuarios?: number;          // ✅ VUELVE (desde tabla usuarios)
  total_puntos_venta?: number;
}

export interface AuditoriaContext {
  usuario_id: number;
  usuario_nombre: string;
  ip?: string;
  user_agent?: string;
}

export class Empresa {
  /**
   * Listar todas las empresas
   */
  static async getAll(filters?: {
    estatus?: 'activo' | 'inactivo' | 'suspendido';
    parent_id?: number;
  }): Promise<EmpresaDetallada[]> {
    const pool = getPool('local');

    let query = `
      SELECT 
        e.id,
        e.parent_id,
        e.nombre,
        e.contacto,
        e.telefono,
        e.costo_charola,
        e.estimado_personas,
        e.created_at,
        e.updated_at,
        e.sincronizado,
        e.estatus,
        ep.nombre AS parent_nombre,
        (SELECT COUNT(*) FROM ubicaciones WHERE empresa_id = e.id) AS total_ubicaciones,
        (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id) AS total_usuarios,
        (SELECT COUNT(*) FROM puntos_venta WHERE empresa_id = e.id) AS total_puntos_venta
      FROM empresas e
      LEFT JOIN empresas ep ON e.parent_id = ep.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.estatus) {
      query += ' AND e.estatus = ?';
      params.push(filters.estatus);
    }

    if (filters?.parent_id !== undefined) {
      if (filters.parent_id === null) {
        query += ' AND e.parent_id IS NULL';
      } else {
        query += ' AND e.parent_id = ?';
        params.push(filters.parent_id);
      }
    }

    query += ' ORDER BY e.nombre ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => this.mapRowToEmpresa(row));
  }

  /**
   * Obtener empresa por ID
   */
  static async getById(id: number): Promise<EmpresaDetallada | null> {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        e.id,
        e.parent_id,
        e.nombre,
        e.contacto,
        e.telefono,
        e.costo_charola,
        e.estimado_personas,
        e.created_at,
        e.updated_at,
        e.sincronizado,
        e.estatus,
        ep.nombre AS parent_nombre,
        (SELECT COUNT(*) FROM ubicaciones WHERE empresa_id = e.id) AS total_ubicaciones,
        (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id) AS total_usuarios,
        (SELECT COUNT(*) FROM puntos_venta WHERE empresa_id = e.id) AS total_puntos_venta
      FROM empresas e
      LEFT JOIN empresas ep ON e.parent_id = ep.id
      WHERE e.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    return this.mapRowToEmpresa(rows[0]);
  }

  /**
   * Crear nueva empresa
   */
  static async create(data: EmpresaData, auditoria: AuditoriaContext): Promise<number> {
    const pool = getPool('local');

    // Validar que el nombre no esté duplicado
    const [existente] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM empresas WHERE nombre = ?',
      [data.nombre]
    );

    if (existente.length > 0) {
      throw new Error('Ya existe una empresa con ese nombre');
    }

    // Validar parent_id si se proporciona
    if (data.parent_id) {
      const [parentRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM empresas WHERE id = ? AND estatus = "activo"',
        [data.parent_id]
      );

      if (parentRows.length === 0) {
        throw new Error('Empresa padre no encontrada o inactiva');
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO empresas (
        parent_id, nombre, contacto, telefono, costo_charola, 
        estimado_personas, estatus, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        data.parent_id || null,
        data.nombre,
        data.contacto,
        data.telefono,
        data.costo_charola || 0,
        data.estimado_personas || 0,
        data.estatus || 'activo'
      ]
    );

    const empresaId = result.insertId;

    console.log(`EMPRESA: Creada empresa_id=${empresaId} nombre="${data.nombre}"`);

    // Registrar en auditoría
    await AuditoriaService.registrar({
      tabla: 'empresas',
      registro_id: empresaId,
      accion: 'CREATE',
      usuario_id: auditoria.usuario_id,
      usuario_nombre: auditoria.usuario_nombre,
      datos_nuevos: data,
      ip_address: auditoria.ip,
      user_agent: auditoria.user_agent
    });

    return empresaId;
  }

  /**
   * Actualizar empresa
   */
  static async update(
    id: number,
    data: Partial<EmpresaData>,
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    // Obtener estado anterior
    const empresaAnterior = await this.getById(id);
    if (!empresaAnterior) {
      throw new Error('Empresa no encontrada');
    }

    // Validar nombre duplicado
    if (data.nombre && data.nombre !== empresaAnterior.nombre) {
      const [existente] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM empresas WHERE nombre = ? AND id != ?',
        [data.nombre, id]
      );

      if (existente.length > 0) {
        throw new Error('Ya existe una empresa con ese nombre');
      }
    }

    // Validar parent_id si se proporciona
    if (data.parent_id !== undefined) {
      if (data.parent_id !== null) {
        // No puede ser su propio padre
        if (data.parent_id === id) {
          throw new Error('Una empresa no puede ser su propia empresa padre');
        }

        const [parentRows] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM empresas WHERE id = ? AND estatus = "activo"',
          [data.parent_id]
        );

        if (parentRows.length === 0) {
          throw new Error('Empresa padre no encontrada o inactiva');
        }
      }
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(data.nombre);
    }
    if (data.contacto !== undefined) {
      updates.push('contacto = ?');
      params.push(data.contacto);
    }
    if (data.telefono !== undefined) {
      updates.push('telefono = ?');
      params.push(data.telefono);
    }
    if (data.parent_id !== undefined) {
      updates.push('parent_id = ?');
      params.push(data.parent_id);
    }
    if (data.costo_charola !== undefined) {
      updates.push('costo_charola = ?');
      params.push(data.costo_charola);
    }
    if (data.estimado_personas !== undefined) {
      updates.push('estimado_personas = ?');
      params.push(data.estimado_personas);
    }
    if (data.estatus !== undefined) {
      updates.push('estatus = ?');
      params.push(data.estatus);
    }

    if (updates.length === 0) {
      return false;
    }

    params.push(id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE empresas SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    console.log(`EMPRESA: Actualizada empresa_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'empresas',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: {
          nombre: empresaAnterior.nombre,
          contacto: empresaAnterior.contacto,
          telefono: empresaAnterior.telefono,
          parent_id: empresaAnterior.parent_id,
          costo_charola: empresaAnterior.costo_charola,
          estimado_personas: empresaAnterior.estimado_personas,
          estatus: empresaAnterior.estatus
        },
        datos_nuevos: data,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Cambiar estatus (soft delete)
   */
  static async changeStatus(
    id: number,
    estatus: 'activo' | 'inactivo' | 'suspendido',
    auditoria: AuditoriaContext
  ): Promise<boolean> {
    const pool = getPool('local');

    const empresaAnterior = await this.getById(id);
    if (!empresaAnterior) {
      throw new Error('Empresa no encontrada');
    }

    if (empresaAnterior.estatus === estatus) {
      throw new Error(`La empresa ya tiene estatus: ${estatus}`);
    }

    // Validar si se puede inactivar
    if (estatus === 'inactivo' || estatus === 'suspendido') {
      const [ubicacionesRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM ubicaciones WHERE empresa_id = ? AND activo = 1',
        [id]
      );

      if (ubicacionesRows[0].count > 0) {
        throw new Error(
          `No se puede cambiar estatus: hay ${ubicacionesRows[0].count} ubicación(es) activa(s)`
        );
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE empresas SET estatus = ?, updated_at = NOW() WHERE id = ?',
      [estatus, id]
    );

    console.log(`EMPRESA: Cambio estatus empresa_id=${id} a ${estatus}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'empresas',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: { estatus: empresaAnterior.estatus },
        datos_nuevos: { estatus },
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Eliminar físicamente (solo para SuperAdmin)
   */
  static async delete(id: number, auditoria: AuditoriaContext): Promise<boolean> {
    const pool = getPool('local');

    const empresa = await this.getById(id);
    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // ✅ VALIDACIONES con nombres correctos de tabla
    if (empresa.total_ubicaciones! > 0) {
      throw new Error(`No se puede eliminar: tiene ${empresa.total_ubicaciones} ubicación(es)`);
    }

    if (empresa.total_usuarios! > 0) {
      throw new Error(`No se puede eliminar: tiene ${empresa.total_usuarios} usuario(s)`);
    }

    if (empresa.total_puntos_venta! > 0) {
      throw new Error(`No se puede eliminar: tiene ${empresa.total_puntos_venta} punto(s) de venta`);
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM empresas WHERE id = ?',
      [id]
    );

    console.log(`EMPRESA: Eliminada empresa_id=${id}`);

    // Registrar en auditoría
    if (result.affectedRows > 0) {
      await AuditoriaService.registrar({
        tabla: 'empresas',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: auditoria.usuario_id,
        usuario_nombre: auditoria.usuario_nombre,
        datos_anteriores: empresa,
        datos_nuevos: null,
        ip_address: auditoria.ip,
        user_agent: auditoria.user_agent
      });
    }

    return result.affectedRows > 0;
  }

  /**
   * Obtener estadísticas de una empresa
   */
  static async getStats(id: number) {
    const pool = getPool('local');

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM ubicaciones WHERE empresa_id = ?) AS total_ubicaciones,
        (SELECT COUNT(*) FROM ubicaciones WHERE empresa_id = ? AND activo = 1) AS ubicaciones_activas,
        (SELECT COUNT(*) FROM puntos_venta WHERE empresa_id = ?) AS total_puntos_venta,
        (SELECT COUNT(*) FROM puntos_venta WHERE empresa_id = ? AND activo = 1) AS puntos_venta_activos,
        (SELECT COUNT(*) FROM usuarios WHERE empresa_id = ?) AS total_usuarios,
        (SELECT COUNT(*) FROM sesiones s 
         INNER JOIN puntos_venta pv ON s.punto_venta_id = pv.id 
         WHERE pv.empresa_id = ? AND s.activa = 1) AS sesiones_activas
      `,
      [id, id, id, id, id, id]
    );

    return rows[0];
  }

  /**
   * Obtener historial de auditoría
   */
  static async getHistorial(id: number) {
    return AuditoriaService.getHistorial('empresas', id);
  }

  /**
   * Helper: Mapear fila a objeto
   */
  private static mapRowToEmpresa(row: any): EmpresaDetallada {
    return {
      id: row.id,
      parent_id: row.parent_id,
      nombre: row.nombre,
      contacto: row.contacto,
      telefono: row.telefono,
      costo_charola: parseFloat(row.costo_charola),
      estimado_personas: row.estimado_personas,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sincronizado: !!row.sincronizado,
      estatus: row.estatus,
      parent_nombre: row.parent_nombre,
      total_ubicaciones: row.total_ubicaciones,
      total_usuarios: row.total_usuarios,        // ✅ INCLUIDO
      total_puntos_venta: row.total_puntos_venta
    };
  }
}