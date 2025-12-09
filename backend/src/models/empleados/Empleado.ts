// src/models/empleados/Empleado.ts
import { getPool } from '../../config/db_controlcomidas';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ====================================
// INTERFACES
// ====================================

export interface EmpleadoData {
  id?: number;
  nombre: string;
  cedula: string;
  empresa_id: number;
  codigo_barras?: string;
  codigo_qr?: string;
  activo?: boolean;
  max_asistencias_por_dia?: number;
  aplica_subsidio?: boolean;
  id_ubicacion_empleado?: string;
  sincronizado?: boolean;
  monedero_id?: number;
  nip_hash?: string;
  nip_failed_attempts?: number;
  nip_locked_until?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface EmpleadoUpdateData {
  nombre?: string;
  cedula?: string;
  empresa_id?: number;
  codigo_barras?: string;
  codigo_qr?: string;
  activo?: boolean;
  max_asistencias_por_dia?: number;
  aplica_subsidio?: boolean;
  id_ubicacion_empleado?: string;
  sincronizado?: boolean;
  monedero_id?: number;
}

export interface AuditoriaData {
  tabla: string;
  registro_id: number;
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'REACTIVATE' | 'DEACTIVATE';
  usuario_id: number;
  usuario_nombre: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  ip_address?: string;
  user_agent?: string;
}

// ====================================
// CLASE EMPLEADO
// ====================================

export class Empleado {
  // ====================================
  // MÉTODOS PRIVADOS DE AUDITORÍA
  // ====================================

  /**
   * Registra una operación en la tabla de auditoría
   */
  private static async registrarAuditoria(data: AuditoriaData): Promise<void> {
    const pool = getPool('local');
    try {
      await pool.query(
        `INSERT INTO auditoria 
         (tabla, registro_id, accion, usuario_id, usuario_nombre, 
          datos_anteriores, datos_nuevos, ip_address, user_agent, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          data.tabla,
          data.registro_id,
          data.accion,
          data.usuario_id,
          data.usuario_nombre,
          data.datos_anteriores ? JSON.stringify(data.datos_anteriores) : null,
          data.datos_nuevos ? JSON.stringify(data.datos_nuevos) : null,
          data.ip_address || null,
          data.user_agent || null
        ]
      );
      console.log(`✅ Auditoría registrada: ${data.accion} en ${data.tabla} #${data.registro_id}`);
    } catch (error) {
      console.error('❌ Error al registrar auditoría:', error);
      // No lanzamos error para no interrumpir la operación principal
    }
  }

  /**
   * Obtiene los datos actuales de un empleado (para auditoría)
   */
  private static async obtenerDatosActuales(id: number): Promise<any | null> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM empleados WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error al obtener datos actuales:', error);
      return null;
    }
  }

  // ====================================
  // CREAR EMPLEADO
  // ====================================

  /**
   * Crea un nuevo empleado en la base de datos
   */
  static async crear(
    data: EmpleadoData,
    usuarioId: number,
    usuarioNombre: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pool = getPool('local');

    // Valores por defecto
    const codigoBarrasFinal = data.codigo_barras || uuidv4();
    const codigoQRFinal = data.codigo_qr || 
      `${data.nombre} - ${data.cedula} - ${data.empresa_id} - ${codigoBarrasFinal}`;
    
    const maxAsistencias = data.max_asistencias_por_dia ?? 1;
    const activoFinal = data.activo !== undefined ? data.activo : true;
    const aplicaSubsidio = data.aplica_subsidio !== undefined ? data.aplica_subsidio : false;
    const sincronizado = data.sincronizado !== undefined ? data.sincronizado : false;

    try {
      // Verificar que la empresa existe
      const [empresas] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM empresas WHERE id = ?',
        [data.empresa_id]
      );

      if (empresas.length === 0) {
        return { success: false, error: 'La empresa especificada no existe' };
      }

      // Verificar si ya existe un empleado con la misma cédula en la misma empresa
      const [existente] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM empleados WHERE cedula = ? AND empresa_id = ?',
        [data.cedula, data.empresa_id]
      );

      if (existente.length > 0) {
        return { 
          success: false, 
          error: `Ya existe un empleado con la cédula ${data.cedula} en esta empresa` 
        };
      }

      // Insertar empleado
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO empleados
         (nombre, cedula, empresa_id, codigo_barras, codigo_qr, activo,
          max_asistencias_por_dia, aplica_subsidio, id_ubicacion_empleado, 
          sincronizado, monedero_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          data.nombre,
          data.cedula,
          data.empresa_id,
          codigoBarrasFinal,
          codigoQRFinal,
          activoFinal ? 1 : 0,
          maxAsistencias,
          aplicaSubsidio ? 1 : 0,
          data.id_ubicacion_empleado || null,
          sincronizado ? 1 : 0,
          data.monedero_id || null
        ]
      );

      const empleadoId = result.insertId;

      const nuevoEmpleado = {
        id: empleadoId,
        nombre: data.nombre,
        cedula: data.cedula,
        empresa_id: data.empresa_id,
        codigo_barras: codigoBarrasFinal,
        codigo_qr: codigoQRFinal,
        activo: activoFinal,
        max_asistencias_por_dia: maxAsistencias,
        aplica_subsidio: aplicaSubsidio,
        id_ubicacion_empleado: data.id_ubicacion_empleado || null,
        sincronizado: sincronizado,
        monedero_id: data.monedero_id || null
      };

      // Registrar auditoría
      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: empleadoId,
        accion: 'CREATE',
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        datos_nuevos: nuevoEmpleado,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return { success: true, data: nuevoEmpleado };
    } catch (error: any) {
      console.error('❌ Error al crear empleado:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return { success: false, error: 'Ya existe un empleado con ese código de barras' };
      }
      
      return { success: false, error: 'Error al crear empleado' };
    }
  }

  // ====================================
  // LISTAR EMPLEADOS
  // ====================================

  /**
   * Lista todos los empleados activos
   */
  static async listar(): Promise<any[]> {
    const pool = getPool('local');
    try {
      const [empleados] = await pool.query<RowDataPacket[]>(
        `SELECT e.*, 
                emp.nombre as empresa_nombre
         FROM empleados e
         LEFT JOIN empresas emp ON e.empresa_id = emp.id
         WHERE e.activo = 1
         ORDER BY e.nombre ASC`
      );
      return empleados;
    } catch (error) {
      console.error('Error al listar empleados:', error);
      throw error;
    }
  }

  /**
   * Lista todos los empleados (activos e inactivos)
   */
  static async listarTodos(): Promise<any[]> {
    const pool = getPool('local');
    try {
      const [empleados] = await pool.query<RowDataPacket[]>(
        `SELECT e.*, 
                emp.nombre as empresa_nombre
         FROM empleados e
         LEFT JOIN empresas emp ON e.empresa_id = emp.id
         ORDER BY e.activo DESC, e.nombre ASC`
      );
      return empleados;
    } catch (error) {
      console.error('Error al listar todos los empleados:', error);
      throw error;
    }
  }

  /**
   * Obtiene un empleado por ID
   */
  static async obtenerPorId(id: number): Promise<any | null> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT e.*, 
                emp.nombre as empresa_nombre
         FROM empleados e
         LEFT JOIN empresas emp ON e.empresa_id = emp.id
         WHERE e.id = ?`,
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error al obtener empleado por ID:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de cambios (auditoría) de un empleado
   */
  static async obtenerHistorial(id: number): Promise<any[]> {
    const pool = getPool('local');
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          id,
          accion,
          usuario_id,
          usuario_nombre,
          datos_anteriores,
          datos_nuevos,
          ip_address,
          user_agent,
          fecha
         FROM auditoria
         WHERE tabla = 'empleados' AND registro_id = ?
         ORDER BY fecha DESC`,
        [id]
      );
      return rows;
    } catch (error) {
      console.error('Error al obtener historial de empleado:', error);
      throw error;
    }
  }

  // ====================================
  // ACTUALIZAR EMPLEADO
  // ====================================

  /**
   * Actualiza un empleado existente
   * 
   * RETROCOMPATIBLE: Si no se pasan parámetros de auditoría, usa valores por defecto
   */
  static async actualizar(
    id: number,
    campos: EmpleadoUpdateData,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';
    const pool = getPool('local');

    try {
      // Obtener datos actuales para auditoría
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      // Si se está cambiando la empresa, verificar que existe
      if (campos.empresa_id && campos.empresa_id !== datosAnteriores.empresa_id) {
        const [empresas] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM empresas WHERE id = ?',
          [campos.empresa_id]
        );

        if (empresas.length === 0) {
          return { success: false, error: 'La empresa especificada no existe' };
        }
      }

      // Si se está cambiando la cédula, verificar que no exista otra con la misma cédula
      if (campos.cedula && campos.cedula !== datosAnteriores.cedula) {
        const empresaId = campos.empresa_id || datosAnteriores.empresa_id;
        const [existente] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM empleados WHERE cedula = ? AND empresa_id = ? AND id != ?',
          [campos.cedula, empresaId, id]
        );

        if (existente.length > 0) {
          return { 
            success: false, 
            error: `Ya existe otro empleado con la cédula ${campos.cedula} en esta empresa` 
          };
        }
      }

      // Construir objeto de actualización
      const camposActualizacion: any = {};
      if (campos.nombre !== undefined) camposActualizacion.nombre = campos.nombre;
      if (campos.cedula !== undefined) camposActualizacion.cedula = campos.cedula;
      if (campos.empresa_id !== undefined) camposActualizacion.empresa_id = campos.empresa_id;
      if (campos.codigo_barras !== undefined) camposActualizacion.codigo_barras = campos.codigo_barras;
      if (campos.codigo_qr !== undefined) camposActualizacion.codigo_qr = campos.codigo_qr;
      if (campos.activo !== undefined) camposActualizacion.activo = campos.activo ? 1 : 0;
      if (campos.max_asistencias_por_dia !== undefined) {
        camposActualizacion.max_asistencias_por_dia = campos.max_asistencias_por_dia;
      }
      if (campos.aplica_subsidio !== undefined) {
        camposActualizacion.aplica_subsidio = campos.aplica_subsidio ? 1 : 0;
      }
      if (campos.id_ubicacion_empleado !== undefined) {
        camposActualizacion.id_ubicacion_empleado = campos.id_ubicacion_empleado;
      }
      if (campos.sincronizado !== undefined) {
        camposActualizacion.sincronizado = campos.sincronizado ? 1 : 0;
      }
      if (campos.monedero_id !== undefined) {
        camposActualizacion.monedero_id = campos.monedero_id;
      }

      camposActualizacion.updated_at = new Date();

      // Actualizar
      const [result] = await pool.query<ResultSetHeader>(
        'UPDATE empleados SET ? WHERE id = ?',
        [camposActualizacion, id]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'No se pudo actualizar el empleado' };
      }

      // Obtener datos actualizados
      const datosNuevos = await this.obtenerDatosActuales(id);

      // Registrar auditoría
      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        ip_address: ip,
        user_agent: agent
      });

      return { success: true, data: datosNuevos };
    } catch (error: any) {
      console.error('❌ Error al actualizar empleado:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return { success: false, error: 'Ya existe un empleado con ese código de barras' };
      }
      
      return { success: false, error: 'Error al actualizar empleado' };
    }
  }

  // ====================================
  // SOFT DELETE (DESACTIVAR)
  // ====================================

  /**
   * Desactiva un empleado (soft delete)
   * 
   * RETROCOMPATIBLE: Si no se pasan parámetros de auditoría, usa valores por defecto
   */
  static async desactivar(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';
    const pool = getPool('local');

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      if (!datosAnteriores.activo) {
        return { success: false, error: 'El empleado ya está desactivado' };
      }

      await pool.query(
        'UPDATE empleados SET activo = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );

      const datosNuevos = await this.obtenerDatosActuales(id);

      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: id,
        accion: 'DEACTIVATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        ip_address: ip,
        user_agent: agent
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error al desactivar empleado:', error);
      return { success: false, error: 'Error al desactivar empleado' };
    }
  }

  /**
   * Reactiva un empleado previamente desactivado
   * 
   * RETROCOMPATIBLE: Si no se pasan parámetros de auditoría, usa valores por defecto
   */
  static async reactivar(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';
    const pool = getPool('local');

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      if (datosAnteriores.activo) {
        return { success: false, error: 'El empleado ya está activo' };
      }

      await pool.query(
        'UPDATE empleados SET activo = 1, updated_at = NOW() WHERE id = ?',
        [id]
      );

      const datosNuevos = await this.obtenerDatosActuales(id);

      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: id,
        accion: 'REACTIVATE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        ip_address: ip,
        user_agent: agent
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error al reactivar empleado:', error);
      return { success: false, error: 'Error al reactivar empleado' };
    }
  }

  // ====================================
  // HARD DELETE (ELIMINACIÓN PERMANENTE)
  // ====================================

  /**
   * Elimina permanentemente un empleado (solo superadministradores)
   * 
   * RETROCOMPATIBLE: Si no se pasan parámetros de auditoría, usa valores por defecto
   */
  static async eliminarPermanente(
    id: number,
    usuarioId?: number,
    usuarioNombre?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Valores por defecto para retrocompatibilidad
    const userId = usuarioId ?? 0;
    const userName = usuarioNombre ?? 'Sistema';
    const ip = ipAddress ?? 'unknown';
    const agent = userAgent ?? 'unknown';
    const pool = getPool('local');

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      // Verificar si tiene registros relacionados
      const [asistencias] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM asistencias WHERE empleado_id = ?',
        [id]
      );

      if (asistencias[0].total > 0) {
        return { 
          success: false, 
          error: `No se puede eliminar el empleado porque tiene ${asistencias[0].total} asistencias registradas` 
        };
      }

      // Registrar auditoría ANTES de eliminar
      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: id,
        accion: 'DELETE',
        usuario_id: userId,
        usuario_nombre: userName,
        datos_anteriores: datosAnteriores,
        ip_address: ip,
        user_agent: agent
      });

      // Eliminar permanentemente
      await pool.query('DELETE FROM empleados WHERE id = ?', [id]);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error al eliminar empleado:', error);
      
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return { 
          success: false, 
          error: 'No se puede eliminar el empleado porque tiene registros relacionados' 
        };
      }
      
      return { success: false, error: 'Error al eliminar empleado' };
    }
  }

  // ====================================
  // BUSCAR EMPLEADOS
  // ====================================

  /**
   * Busca empleados por nombre, cédula, código de barras o código QR
   */
  static async buscar(q: string, soloActivos: boolean = true): Promise<any[]> {
    const pool = getPool('local');
    const likeQuery = `%${q}%`;
    
    try {
      let query = `
        SELECT e.*, 
               emp.nombre as empresa_nombre
        FROM empleados e
        LEFT JOIN empresas emp ON e.empresa_id = emp.id
        WHERE (e.nombre LIKE ? OR e.cedula LIKE ? 
               OR e.codigo_barras LIKE ? OR e.codigo_qr LIKE ?)
      `;

      if (soloActivos) {
        query += ' AND e.activo = 1';
      }

      query += ' ORDER BY e.nombre ASC';

      const [rows] = await pool.query<RowDataPacket[]>(
        query,
        [likeQuery, likeQuery, likeQuery, likeQuery]
      );
      
      return rows;
    } catch (error) {
      console.error('Error al buscar empleados:', error);
      throw error;
    }
  }

  // ====================================
  // GESTIÓN DE NIP
  // ====================================

  /**
   * Establece el NIP hash de un empleado
   */
  static async establecerNip(
    id: number,
    nipHash: string,
    usuarioId: number,
    usuarioNombre: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    const pool = getPool('local');

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      await pool.query(
        `UPDATE empleados 
         SET nip_hash = ?, 
             nip_failed_attempts = 0, 
             nip_locked_until = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [nipHash, id]
      );

      const datosNuevos = await this.obtenerDatosActuales(id);

      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        datos_anteriores: { ...datosAnteriores, nip_hash: '[PROTEGIDO]' },
        datos_nuevos: { ...datosNuevos, nip_hash: '[PROTEGIDO]' },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error al establecer NIP:', error);
      return { success: false, error: 'Error al establecer NIP' };
    }
  }

  // ====================================
  // ACTUALIZACIÓN DE MONEDERO
  // ====================================

  /**
   * Actualiza el monedero_id de un empleado
   */
  static async actualizarMonedero(
    id: number,
    monederoId: number | null,
    usuarioId: number,
    usuarioNombre: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pool = getPool('local');

    try {
      const datosAnteriores = await this.obtenerDatosActuales(id);
      if (!datosAnteriores) {
        return { success: false, error: 'Empleado no encontrado' };
      }

      await pool.query(
        'UPDATE empleados SET monedero_id = ?, updated_at = NOW() WHERE id = ?',
        [monederoId, id]
      );

      const datosNuevos = await this.obtenerDatosActuales(id);

      await this.registrarAuditoria({
        tabla: 'empleados',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        datos_anteriores: datosAnteriores,
        datos_nuevos: datosNuevos,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return { success: true, data: datosNuevos };
    } catch (error) {
      console.error('❌ Error al actualizar monedero:', error);
      return { success: false, error: 'Error al actualizar monedero del empleado' };
    }
  }
}