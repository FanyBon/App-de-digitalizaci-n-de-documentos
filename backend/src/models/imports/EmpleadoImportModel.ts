// src/models/imports/EmpleadoImportModel.ts
import { getPool } from '../../config/db_controlcomidas';
import { PoolConnection, ResultSetHeader } from 'mysql2/promise';

export interface EmpleadoImportDTO {
  clave: string;
  empresa_id: number;
  id_ubicacion_empleado?: string;
}

export interface ProcessReport {
  created: number;
  updated: number;
  reactivated: number;
  skipped: number;
  inactivated: number;
  monederosCreated: number;
  monederosReactivated: number;
  monederosInactivated: number;
  errors: { dto: EmpleadoImportDTO; reason: string }[];
}

export interface AuditoriaImportContext {
  usuario_id: number;
  usuario_nombre: string;
  nombre_archivo: string;
  ip?: string;
  user_agent?: string;
}

interface HistoricoEntry {
  empleado_id: number;
  nombre: string;
  cedula: string;
  empresa_id: number;
  codigo_barras: string;
  activo: number;
  aplica_subsidio: number;
  id_ubicacion_empleado: string | null;
  sincronizado: number;
  codigo_qr: string;
  monedero_id: number | null;
  max_asistencias_por_dia: number;
  action: string;
}

export class EmpleadoImportModel {
  private static readonly CHUNK_SIZE = 500;
  private static readonly MAX_IN_CLAUSE = 1000;
  private static readonly QUERY_TIMEOUT = 30000;

  /**
   * ⭐ NUEVO: Procesar batch con auditoría
   */
  static async processBatchWithAudit(
    dtos: EmpleadoImportDTO[],
    auditoria: AuditoriaImportContext
  ): Promise<ProcessReport> {
    const startTime = Date.now();
    
    try {
      const report = await this.processBatch(dtos);
      const duration = Date.now() - startTime;
      const estado = this.determinarEstado(report, dtos.length);
      
      await this.registrarImportacion(dtos.length, report, auditoria, duration, estado);
      
      console.log(`✅ Importación completada en ${duration}ms - Estado: ${estado}`);
      
      return report;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await this.registrarImportacionFallida(dtos.length, auditoria, duration, error);
      throw error;
    }
  }

  /**
   * Procesar batch (método principal)
   */
  static async processBatch(dtos: EmpleadoImportDTO[]): Promise<ProcessReport> {
    const totalReport: ProcessReport = {
      created: 0,
      updated: 0,
      reactivated: 0,
      skipped: 0,
      inactivated: 0,
      monederosCreated: 0,
      monederosReactivated: 0,
      monederosInactivated: 0,
      errors: [],
    };

    const validDtos = dtos.filter(dto => {
      const clave = dto.clave?.trim().toUpperCase();
      if (!clave) {
        totalReport.errors.push({ dto, reason: 'Clave vacía' });
        return false;
      }
      dto.clave = clave;
      return true;
    });

    if (validDtos.length === 0) {
      console.log('⚠️ No hay DTOs válidos para procesar');
      return totalReport;
    }

    const chunks = this.chunkArray(validDtos, this.CHUNK_SIZE);
    console.log(`📊 Procesando ${validDtos.length} registros en ${chunks.length} chunks de ${this.CHUNK_SIZE}`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 Procesando chunk ${i + 1}/${chunks.length}...`);
      
      try {
        const chunkReport = await this.processChunk(chunks[i]);
        
        totalReport.created += chunkReport.created;
        totalReport.updated += chunkReport.updated;
        totalReport.reactivated += chunkReport.reactivated;
        totalReport.skipped += chunkReport.skipped;
        totalReport.inactivated += chunkReport.inactivated;
        totalReport.monederosCreated += chunkReport.monederosCreated;
        totalReport.monederosReactivated += chunkReport.monederosReactivated;
        totalReport.monederosInactivated += chunkReport.monederosInactivated;
        totalReport.errors.push(...chunkReport.errors);
        
        console.log(`✅ Chunk ${i + 1} completado: +${chunkReport.created} creados, +${chunkReport.updated} actualizados`);
      } catch (err) {
        console.error(`❌ Error en chunk ${i + 1}:`, err);
        chunks[i].forEach(dto => {
          totalReport.errors.push({ dto, reason: `Error en chunk: ${err}` });
        });
      }
    }

    await this.inactivateAbsentEmpleadosGlobal(validDtos, totalReport);

    return totalReport;
  }

  /**
   * Procesar un chunk con su propia transacción
   */
  private static async processChunk(dtos: EmpleadoImportDTO[]): Promise<ProcessReport> {
    let conn: PoolConnection | null = null;
    
    try {
      conn = await getPool('local').getConnection();
      await conn.beginTransaction();

      const report = await this.processInTransaction(conn, dtos);
      
      await conn.commit();
      return report;
      
    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error('Error en rollback:', rollbackErr);
        }
      }
      throw err;
      
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Procesar en transacción
   */
  private static async processInTransaction(
    conn: PoolConnection,
    dtos: EmpleadoImportDTO[]
  ): Promise<ProcessReport> {
    const report: ProcessReport = {
      created: 0,
      updated: 0,
      reactivated: 0,
      skipped: 0,
      inactivated: 0,
      monederosCreated: 0,
      monederosReactivated: 0,
      monederosInactivated: 0,
      errors: [],
    };

    const historicoQueue: HistoricoEntry[] = [];

    const empresaIds = Array.from(new Set(dtos.map(d => d.empresa_id)));
    const validEmpresas = await this.validateEmpresas(conn, empresaIds);
    
    const dtosWithValidCompany = dtos.filter(dto => {
      if (!validEmpresas.has(dto.empresa_id)) {
        report.errors.push({ dto, reason: `Empresa con id=${dto.empresa_id} no existe` });
        return false;
      }
      return true;
    });

    if (dtosWithValidCompany.length === 0) return report;

    const claves = dtosWithValidCompany.map(d => d.clave);
    const existingEmpleados = await this.fetchEmpleadosByClavesBatched(conn, claves);

    for (const dto of dtosWithValidCompany) {
      const clave = dto.clave;
      const existing = existingEmpleados.get(clave);

      if (!existing) {
        await this.createNewEmpleado(conn, dto, clave, report, historicoQueue);
      } else {
        await this.processExistingEmpleado(conn, dto, existing, report, historicoQueue);
      }
    }

    if (historicoQueue.length > 0) {
      await this.batchInsertHistorico(conn, historicoQueue);
    }

    return report;
  }

  /**
   * Fetch empleados por claves en batch
   */
  private static async fetchEmpleadosByClavesBatched(
    conn: PoolConnection,
    claves: string[]
  ): Promise<Map<string, any>> {
    if (claves.length === 0) return new Map();

    const map = new Map();
    const batches = this.chunkArray(claves, this.MAX_IN_CLAUSE);
    
    for (const batch of batches) {
      const placeholders = batch.map(() => '?').join(',');
      const [rows]: any[] = await conn.query(
        `SELECT id, nombre, cedula, codigo_barras, empresa_id,
                id_ubicacion_empleado, activo, aplica_subsidio,
                monedero_id, sincronizado, codigo_qr, max_asistencias_por_dia
         FROM empleados
         WHERE nombre IN (${placeholders})
            OR cedula IN (${placeholders})
            OR codigo_barras IN (${placeholders})`,
        [...batch, ...batch, ...batch]
      );

      for (const row of rows) {
        map.set(row.nombre, row);
        if (row.cedula && row.cedula !== row.nombre) map.set(row.cedula, row);
        if (row.codigo_barras && row.codigo_barras !== row.nombre) map.set(row.codigo_barras, row);
      }
    }

    return map;
  }

  /**
   * Validar empresas
   */
  private static async validateEmpresas(
    conn: PoolConnection,
    empresaIds: number[]
  ): Promise<Set<number>> {
    if (empresaIds.length === 0) return new Set();
    
    const placeholders = empresaIds.map(() => '?').join(',');
    const [rows]: any[] = await conn.query(
      `SELECT id FROM empresas WHERE id IN (${placeholders})`,
      empresaIds
    );
    return new Set(rows.map((r: any) => r.id));
  }

  /**
   * Crear nuevo empleado
   */
  private static async createNewEmpleado(
    conn: PoolConnection,
    dto: EmpleadoImportDTO,
    clave: string,
    report: ProcessReport,
    historicoQueue: HistoricoEntry[]
  ): Promise<void> {
    const [res]: any = await conn.query(
      `INSERT INTO empleados
        (nombre, cedula, empresa_id, codigo_barras,
         activo, aplica_subsidio, id_ubicacion_empleado,
         sincronizado, codigo_qr, monedero_id,
         max_asistencias_por_dia, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 1, ?, 0, '', NULL, 1, NOW(), NOW())`,
      [clave, clave, dto.empresa_id, clave, dto.id_ubicacion_empleado || null]
    );

    if (!res.insertId) {
      report.errors.push({ dto, reason: 'Fallo al insertar empleado' });
      return;
    }

    const empleadoId = res.insertId;
    report.created++;

    historicoQueue.push({
      empleado_id: empleadoId,
      nombre: clave,
      cedula: clave,
      empresa_id: dto.empresa_id,
      codigo_barras: clave,
      activo: 1,
      aplica_subsidio: 1,
      id_ubicacion_empleado: dto.id_ubicacion_empleado || null,
      sincronizado: 0,
      codigo_qr: '',
      monedero_id: null,
      max_asistencias_por_dia: 1,
      action: 'create',
    });

    await this.createMonedero(conn, empleadoId, clave, dto, report, historicoQueue);
  }

  /**
   * Crear monedero
   */
  private static async createMonedero(
    conn: PoolConnection,
    empleadoId: number,
    clave: string,
    dto: EmpleadoImportDTO,
    report: ProcessReport,
    historicoQueue: HistoricoEntry[]
  ): Promise<void> {
    const [monRes]: any = await conn.query(
      `INSERT INTO monederos (empleado_id, saldo_actual, fecha_creacion, activo)
       VALUES (?, 0.00, NOW(), 1)`,
      [empleadoId]
    );

    if (!monRes.insertId) return;

    const walletId = monRes.insertId;
    report.monederosCreated++;

    await conn.query(
      `UPDATE empleados SET monedero_id = ? WHERE id = ?`,
      [walletId, empleadoId]
    );

    historicoQueue.push({
      empleado_id: empleadoId,
      nombre: clave,
      cedula: clave,
      empresa_id: dto.empresa_id,
      codigo_barras: clave,
      activo: 1,
      aplica_subsidio: 1,
      id_ubicacion_empleado: dto.id_ubicacion_empleado || null,
      sincronizado: 0,
      codigo_qr: '',
      monedero_id: walletId,
      max_asistencias_por_dia: 1,
      action: 'wallet_create',
    });
  }

  /**
   * Procesar empleado existente
   */
  private static async processExistingEmpleado(
    conn: PoolConnection,
    dto: EmpleadoImportDTO,
    existing: any,
    report: ProcessReport,
    historicoQueue: HistoricoEntry[]
  ): Promise<void> {
    if (!existing.monedero_id) {
      await this.createMonederoForExisting(conn, existing, report, historicoQueue);
    }

    const newUbic = dto.id_ubicacion_empleado || null;

    if (existing.activo === 0 || existing.aplica_subsidio === 0) {
      await this.reactivateEmpleado(conn, existing, dto, newUbic, report, historicoQueue);
      return;
    }

    const needsUpdate =
      existing.empresa_id !== dto.empresa_id ||
      existing.id_ubicacion_empleado !== newUbic;

    if (needsUpdate) {
      await this.updateEmpleado(conn, existing, dto, newUbic, report, historicoQueue);
    } else {
      report.skipped++;
    }
  }

  /**
   * Crear monedero para empleado existente
   */
  private static async createMonederoForExisting(
    conn: PoolConnection,
    existing: any,
    report: ProcessReport,
    historicoQueue: HistoricoEntry[]
  ): Promise<void> {
    const [monRes]: any = await conn.query(
      `INSERT INTO monederos (empleado_id, saldo_actual, fecha_creacion, activo)
       VALUES (?, 0.00, NOW(), 1)`,
      [existing.id]
    );

    if (!monRes.insertId) return;

    const walletId = monRes.insertId;
    report.monederosCreated++;

    await conn.query(
      `UPDATE empleados SET monedero_id = ? WHERE id = ?`,
      [walletId, existing.id]
    );

    historicoQueue.push({
      ...existing,
      empleado_id: existing.id,
      monedero_id: walletId,
      action: 'wallet_create',
    });
  }

  /**
   * Reactivar empleado
   */
  private static async reactivateEmpleado(
    conn: PoolConnection,
    existing: any,
    dto: EmpleadoImportDTO,
    newUbic: string | null,
    report: ProcessReport,
    historicoQueue: HistoricoEntry[]
  ): Promise<void> {
    await conn.query(
      `UPDATE empleados
       SET activo = 1, aplica_subsidio = 1,
           empresa_id = ?, id_ubicacion_empleado = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [dto.empresa_id, newUbic, existing.id]
    );

    report.reactivated++;

    historicoQueue.push({
      ...existing,
      empleado_id: existing.id,
      empresa_id: dto.empresa_id,
      activo: 1,
      aplica_subsidio: 1,
      id_ubicacion_empleado: newUbic,
      action: 'reactivate',
    });

    const [mR]: any = await conn.query(
      `UPDATE monederos SET activo = 1, updated_at = NOW()
       WHERE empleado_id = ?`,
      [existing.id]
    );

    if (mR.affectedRows) {
      report.monederosReactivated++;
      historicoQueue.push({
        ...existing,
        empleado_id: existing.id,
        activo: 1,
        aplica_subsidio: 1,
        action: 'wallet_reactivate',
      });
    }
  }

  /**
   * Actualizar empleado
   */
  private static async updateEmpleado(
    conn: PoolConnection,
    existing: any,
    dto: EmpleadoImportDTO,
    newUbic: string | null,
    report: ProcessReport,
    historicoQueue: HistoricoEntry[]
  ): Promise<void> {
    await conn.query(
      `UPDATE empleados
       SET empresa_id = ?, id_ubicacion_empleado = ?, updated_at = NOW()
       WHERE id = ?`,
      [dto.empresa_id, newUbic, existing.id]
    );

    report.updated++;

    historicoQueue.push({
      ...existing,
      empleado_id: existing.id,
      empresa_id: dto.empresa_id,
      id_ubicacion_empleado: newUbic,
      action: 'update',
    });
  }

  /**
   * Inactivar empleados ausentes GLOBAL
   */
  private static async inactivateAbsentEmpleadosGlobal(
    validDtos: EmpleadoImportDTO[],
    report: ProcessReport
  ): Promise<void> {
    let conn: PoolConnection | null = null;
    
    try {
      conn = await getPool('local').getConnection();
      await conn.beginTransaction();

      const empresaIds = Array.from(new Set(validDtos.map(d => d.empresa_id)));
      const claves = validDtos.map(d => d.clave);
      
      const historicoQueue: HistoricoEntry[] = [];
      const claveBatches = this.chunkArray(claves, this.MAX_IN_CLAUSE);
      
      for (const claveBatch of claveBatches) {
        const phEmp = empresaIds.map(() => '?').join(',');
        const phCla = claveBatch.map(() => '?').join(',');

        const [toInactivate]: any[] = await conn.query(
          `SELECT id, nombre, cedula, codigo_barras, empresa_id,
                  id_ubicacion_empleado, activo, aplica_subsidio,
                  sincronizado, codigo_qr, monedero_id, max_asistencias_por_dia
           FROM empleados
           WHERE empresa_id IN (${phEmp})
             AND nombre NOT IN (${phCla})
             AND activo = 1`,
          [...empresaIds, ...claveBatch]
        );

        for (const emp of toInactivate) {
          await conn.query(
            `UPDATE empleados SET activo = 0, aplica_subsidio = 0, updated_at = NOW() WHERE id = ?`,
            [emp.id]
          );

          report.inactivated++;
          historicoQueue.push({ ...emp, empleado_id: emp.id, activo: 0, aplica_subsidio: 0, action: 'inactivate' });

          const [mR]: any = await conn.query(
            `UPDATE monederos SET activo = 0, updated_at = NOW() WHERE empleado_id = ?`,
            [emp.id]
          );

          if (mR.affectedRows) {
            report.monederosInactivated++;
            historicoQueue.push({ ...emp, empleado_id: emp.id, activo: 0, aplica_subsidio: 0, action: 'wallet_inactivate' });
          }
        }
      }

      if (historicoQueue.length > 0) {
        await this.batchInsertHistorico(conn, historicoQueue);
      }

      await conn.commit();
    } catch (err) {
      if (conn) await conn.rollback();
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * BATCH INSERT de históricos
   */
  private static async batchInsertHistorico(
    conn: PoolConnection,
    entries: HistoricoEntry[]
  ): Promise<void> {
    if (entries.length === 0) return;

    const values = entries.map(e => [
      e.empleado_id, e.nombre, e.cedula, e.empresa_id, e.codigo_barras,
      e.activo, e.aplica_subsidio, e.id_ubicacion_empleado,
      e.sincronizado, e.codigo_qr, e.monedero_id,
      e.max_asistencias_por_dia, e.action
    ]);

    await conn.query(
      `INSERT INTO empleados_historico
        (empleado_id, nombre, cedula, empresa_id, codigo_barras,
         activo, aplica_subsidio, id_ubicacion_empleado,
         sincronizado, codigo_qr, monedero_id,
         max_asistencias_por_dia, action)
       VALUES ?`,
      [values]
    );
  }

  /**
   * ⭐ NUEVO: Registrar importación exitosa
   */
  private static async registrarImportacion(
  totalRegistros: number,
  report: ProcessReport,
  auditoria: AuditoriaImportContext,
  duracion: number,
  estado: 'exitoso' | 'con_errores' | 'fallido'
): Promise<void> {
  const pool = getPool('local');

  try {
    // ⭐ GARANTIZAR QUE ERRORES SEA UN JSON VÁLIDO
    const erroresJson = report.errors.length > 0 
      ? JSON.stringify(report.errors) 
      : JSON.stringify([]); // ✅ Array vacío en vez de null

    await pool.query(
      `INSERT INTO importaciones_empleados (
        usuario_id, usuario_nombre, nombre_archivo,
        total_registros, registros_creados, registros_actualizados,
        registros_reactivados, registros_omitidos, registros_inactivados,
        monederos_creados, monederos_reactivados, monederos_inactivados,
        errores, duracion_ms, ip_address, user_agent, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditoria.usuario_id,
        auditoria.usuario_nombre,
        auditoria.nombre_archivo,
        totalRegistros,
        report.created,
        report.updated,
        report.reactivated,
        report.skipped,
        report.inactivated,
        report.monederosCreated,
        report.monederosReactivated,
        report.monederosInactivated,
        erroresJson, // ⭐ SIEMPRE UN JSON VÁLIDO
        duracion,
        auditoria.ip || null,
        auditoria.user_agent || null,
        estado
      ]
    );

    console.log(`📝 Importación registrada en auditoría: ${estado}`);
  } catch (error) {
    console.error('❌ Error al registrar importación en auditoría:', error);
  }
}

  /**
   * ⭐ NUEVO: Registrar importación fallida
   */
  private static async registrarImportacionFallida(
    totalRegistros: number,
    auditoria: AuditoriaImportContext,
    duracion: number,
    error: any
  ): Promise<void> {
    const pool = getPool('local');

    try {
      await pool.query(
        `INSERT INTO importaciones_empleados (
          usuario_id, usuario_nombre, nombre_archivo,
          total_registros, errores, duracion_ms,
          ip_address, user_agent, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'fallido')`,
        [
          auditoria.usuario_id,
          auditoria.usuario_nombre,
          auditoria.nombre_archivo,
          totalRegistros,
          JSON.stringify([{ reason: error.message || 'Error desconocido' }]),
          duracion,
          auditoria.ip || null,
          auditoria.user_agent || null
        ]
      );

      console.log('📝 Importación fallida registrada en auditoría');
    } catch (auditError) {
      console.error('❌ Error al registrar importación fallida:', auditError);
    }
  }

  /**
   * ⭐ NUEVO: Determinar estado
   */
  private static determinarEstado(report: ProcessReport, total: number): 'exitoso' | 'con_errores' | 'fallido' {
    if (report.errors.length === 0) return 'exitoso';
    if (report.errors.length === total) return 'fallido';
    return 'con_errores';
  }

  /**
   * ⭐ NUEVO: Obtener historial
   */
  /**
 * ⭐ NUEVO: Obtener historial (con manejo seguro de JSON)
 */
static async getHistorial(filters?: {
  usuario_id?: number;
  estado?: 'exitoso' | 'con_errores' | 'fallido';
  fecha_desde?: Date;
  fecha_hasta?: Date;
  limit?: number;
}): Promise<any[]> {
  const pool = getPool('local');

  let query = `
    SELECT 
      id, usuario_id, usuario_nombre, nombre_archivo,
      total_registros, registros_creados, registros_actualizados,
      registros_reactivados, registros_omitidos, registros_inactivados,
      monederos_creados, monederos_reactivados, monederos_inactivados,
      errores, duracion_ms, estado, created_at
    FROM importaciones_empleados
    WHERE 1=1
  `;

  const params: any[] = [];

  if (filters?.usuario_id) {
    query += ' AND usuario_id = ?';
    params.push(filters.usuario_id);
  }

  if (filters?.estado) {
    query += ' AND estado = ?';
    params.push(filters.estado);
  }

  if (filters?.fecha_desde) {
    query += ' AND created_at >= ?';
    params.push(filters.fecha_desde);
  }

  if (filters?.fecha_hasta) {
    query += ' AND created_at <= ?';
    params.push(filters.fecha_hasta);
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const [rows]: any = await pool.query(query, params);

  // ⭐ MANEJO SEGURO DE JSON
  return rows.map((row: any) => {
    let erroresParsed = [];
    
    try {
      // Si errores es NULL, undefined, o string vacío, usar array vacío
      if (row.errores && row.errores.trim() !== '') {
        erroresParsed = JSON.parse(row.errores);
      }
    } catch (parseError) {
      console.warn(`⚠️ Error parseando errores del registro ${row.id}:`, parseError);
      erroresParsed = [];
    }

    return {
      ...row,
      errores: erroresParsed
    };
  });
}

  /**
   * Utilidad: dividir arrays
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}