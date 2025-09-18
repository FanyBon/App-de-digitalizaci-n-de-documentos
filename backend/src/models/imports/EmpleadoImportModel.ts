// src/models/imports/EmpleadoImportModel.ts
/**
 Procesa en lote:
 - INSERT si no existe
 - UPDATE si existe y cambian empresa o ubicación
 - REACTIVATE si existe pero estaba inactivo o sin subsidio
 - SKIP si existe y no hay cambios
 - SOFT‐DELETE para ausentes
   
 Además:
  - Monederos: crea, reactiva o inactiva según corresponda
*/
// src/models/imports/EmpleadoImportModel.ts
import { getConnection } from '../../config/db_controlcomidas';

export interface EmpleadoImportDTO {
  clave: string;
  empresa_id: number;
  id_ubicacion_empleado?: string;
}

export class EmpleadoImportModel {
  static async processBatch(
    dtos: EmpleadoImportDTO[]
  ): Promise<{
    created: number;
    updated: number;
    reactivated: number;
    skipped: number;
    inactivated: number;
    monederosCreated: number;
    monederosReactivated: number;
    monederosInactivated: number;
    errors: { dto: EmpleadoImportDTO; reason: string }[];
  }> {
    const conn = await getConnection();
    const report = {
      created: 0,
      updated: 0,
      reactivated: 0,
      skipped: 0,
      inactivated: 0,
      monederosCreated: 0,
      monederosReactivated: 0,
      monederosInactivated: 0,
      errors: [] as { dto: EmpleadoImportDTO; reason: string }[],
    };

    const processedClaves = dtos.map(d => d.clave).filter(Boolean);
    const empresaIds    = Array.from(new Set(dtos.map(d => d.empresa_id)));

    await conn.beginTransaction();
    try {
      for (const dto of dtos) {
        const clave = dto.clave.trim();
        if (!clave) {
          report.errors.push({ dto, reason: 'Clave vacía' });
          continue;
        }

        // 1) Validar FK empresa
        const [empRows]: any[] = await conn.query(
          `SELECT 1
             FROM empresas
            WHERE id = ?`,
          [dto.empresa_id]
        );
        if (!empRows.length) {
          report.errors.push({
            dto,
            reason: `Empresa con id=${dto.empresa_id} no existe`,
          });
          continue;
        }

        // 2) Buscar en empleados
        // ahora solicitamos nombre, cedula y codigo_barras para el histórico
        const [rows]: any[] = await conn.query(
          `SELECT id,
                  nombre,
                  cedula,
                  codigo_barras,
                  empresa_id,
                  id_ubicacion_empleado,
                  activo,
                  aplica_subsidio,
                  monedero_id,
                  sincronizado,
                  codigo_qr,
                  max_asistencias_por_dia
             FROM empleados
            WHERE nombre = ? OR cedula = ? OR codigo_barras = ?`,
          [clave, clave, clave]
        );

        // 3) INSERT NUEVO
        if (!rows.length) {
          const [res]: any = await conn.query(
            `INSERT INTO empleados
              (nombre, cedula, empresa_id, codigo_barras,
               activo, aplica_subsidio, id_ubicacion_empleado,
               sincronizado, codigo_qr, monedero_id,
               max_asistencias_por_dia, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, 1, ?, 0, '', NULL, 1, NOW(), NOW())`,
            [
              clave,
              clave,
              dto.empresa_id,
              clave,
              dto.id_ubicacion_empleado || null,
            ]
          );
          if (!res.insertId) {
            report.errors.push({ dto, reason: 'Fallo al insertar empleado' });
            continue;
          }

          const empleadoId = res.insertId;
          report.created++;

          // 3a) Histórico (empleado creado)
          await this.logHistorico(conn, {
            empleado_id: empleadoId,
            nombre:       clave,
            cedula:       clave,
            empresa_id:   dto.empresa_id,
            codigo_barras: clave,
            activo:        1,
            aplica_subsidio: 1,
            id_ubicacion_empleado: dto.id_ubicacion_empleado || null,
            sincronizado:  0,
            codigo_qr:     '',
            monedero_id:   null,
            max_asistencias_por_dia: 1,
          }, 'create');

          // 3b) Crear monedero para nuevo empleado
          const [monRes]: any = await conn.query(
            `INSERT INTO monederos
               (empleado_id, saldo_actual, fecha_creacion, activo)
             VALUES (?, 0.00, NOW(), 1)`,
            [empleadoId]
          );
          if (monRes.insertId) {
            const walletId = monRes.insertId;
            report.monederosCreated++;

            // 3c) Enlazar monedero y guardar histórico
            await conn.query(
              `UPDATE empleados
                 SET monedero_id = ?
               WHERE id = ?`,
              [walletId, empleadoId]
            );

            await this.logHistorico(conn, {
              empleado_id: empleadoId,
              nombre:       clave,
              cedula:       clave,
              empresa_id:   dto.empresa_id,
              codigo_barras: clave,
              activo:        1,
              aplica_subsidio: 1,
              id_ubicacion_empleado: dto.id_ubicacion_empleado || null,
              sincronizado:  0,
              codigo_qr:     '',
              monedero_id:   walletId,
              max_asistencias_por_dia: 1,
            }, 'wallet_create');
          }

          continue;
        }

        // 4) EXISTENTE
        const existing = rows[0];
        const newUbic  = dto.id_ubicacion_empleado || null;

        // 4a) Crear monedero si falta
        if (!existing.monedero_id) {
          const [monRes]: any = await conn.query(
            `INSERT INTO monederos
               (empleado_id, saldo_actual, fecha_creacion, activo)
             VALUES (?, 0.00, NOW(), 1)`,
            [existing.id]
          );
          if (monRes.insertId) {
            const walletId = monRes.insertId;
            report.monederosCreated++;

            await conn.query(
              `UPDATE empleados
                 SET monedero_id = ?
               WHERE id = ?`,
              [walletId, existing.id]
            );

            await this.logHistorico(conn, {
              empleado_id: existing.id,
              nombre:      existing.nombre,
              cedula:      existing.cedula,
              empresa_id:  existing.empresa_id,
              codigo_barras: existing.codigo_barras,
              activo:       existing.activo,
              aplica_subsidio: existing.aplica_subsidio,
              id_ubicacion_empleado: existing.id_ubicacion_empleado,
              sincronizado: existing.sincronizado,
              codigo_qr:    existing.codigo_qr,
              monedero_id:  walletId,
              max_asistencias_por_dia: existing.max_asistencias_por_dia,
            }, 'wallet_create');
          }
        }

        // 4b) Reactivación empleado y monedero
        if (existing.activo === 0 || existing.aplica_subsidio === 0) {
          const [res]: any = await conn.query(
            `UPDATE empleados
               SET activo          = 1,
                   aplica_subsidio = 1,
                   empresa_id      = ?,
                   id_ubicacion_empleado = ?,
                   updated_at      = NOW()
             WHERE id = ?`,
            [dto.empresa_id, newUbic, existing.id]
          );
          if (res.affectedRows) {
            report.reactivated++;
            await this.logHistorico(conn, {
              empleado_id: existing.id,
              nombre:      existing.nombre,
              cedula:      existing.cedula,
              empresa_id:  dto.empresa_id,
              codigo_barras: existing.codigo_barras,
              activo:       1,
              aplica_subsidio: 1,
              id_ubicacion_empleado: newUbic,
              sincronizado: existing.sincronizado,
              codigo_qr:    existing.codigo_qr,
              monedero_id:  existing.monedero_id,
              max_asistencias_por_dia: existing.max_asistencias_por_dia
            }, 'reactivate');

            // Reactivar monedero
            const [mR]: any = await conn.query(
              `UPDATE monederos
                 SET activo     = 1,
                     updated_at = NOW()
               WHERE empleado_id = ?`,
              [existing.id]
            );
            if (mR.affectedRows) {
              report.monederosReactivated++;
              await this.logHistorico(conn, {
                empleado_id: existing.id,
                nombre:      existing.nombre,
                cedula:      existing.cedula,
                empresa_id:  existing.empresa_id,
                codigo_barras: existing.codigo_barras,
                activo:       1,
                aplica_subsidio: 1,
                id_ubicacion_empleado: existing.id_ubicacion_empleado,
                sincronizado: existing.sincronizado,
                codigo_qr:    existing.codigo_qr,
                monedero_id:  existing.monedero_id,
                max_asistencias_por_dia: existing.max_asistencias_por_dia
              }, 'wallet_reactivate');
            }
          }
          continue;
        }

        // 4c) UPDATE si cambian empresa o ubicación
        const needsUpdate =
          existing.empresa_id !== dto.empresa_id ||
          existing.id_ubicacion_empleado !== newUbic;
        if (needsUpdate) {
          const [res]: any = await conn.query(
            `UPDATE empleados
               SET empresa_id            = ?,
                   id_ubicacion_empleado = ?,
                   updated_at            = NOW()
             WHERE id = ?`,
            [dto.empresa_id, newUbic, existing.id]
          );
          if (res.affectedRows) {
            report.updated++;
            await this.logHistorico(conn, {
              empleado_id: existing.id,
              nombre:      existing.nombre,
              cedula:      existing.cedula,
              empresa_id:  dto.empresa_id,
              codigo_barras: existing.codigo_barras,
              activo:       existing.activo,
              aplica_subsidio: existing.aplica_subsidio,
              id_ubicacion_empleado: newUbic,
              sincronizado: existing.sincronizado,
              codigo_qr:    existing.codigo_qr,
              monedero_id:  existing.monedero_id,
              max_asistencias_por_dia: existing.max_asistencias_por_dia
            }, 'update');
          }
        } else {
          report.skipped++;
        }
      }

      // 5) Soft-delete selectivo + inactivar monederos
      const placeholdersEmp = empresaIds.map(() => '?').join(',');
      const placeholdersCla = processedClaves.map(() => '?').join(',');
      const [toInactivate]: any[] = await conn.query(
        `SELECT id, nombre, cedula, codigo_barras,
                empresa_id, id_ubicacion_empleado,
                activo, aplica_subsidio, sincronizado,
                codigo_qr, monedero_id, max_asistencias_por_dia
           FROM empleados
          WHERE empresa_id IN (${placeholdersEmp})
            AND nombre NOT IN (${placeholdersCla})
            AND activo = 1`,
        [...empresaIds, ...processedClaves]
      );

      for (const emp of toInactivate) {
        // 5a) inactivar empleado
        await conn.query(
          `UPDATE empleados
             SET activo          = 0,
                 aplica_subsidio = 0,
                 updated_at      = NOW()
           WHERE id = ?`,
          [emp.id]
        );
        report.inactivated++;
        await this.logHistorico(conn, {
          empleado_id: emp.id,
          nombre:      emp.nombre,
          cedula:      emp.cedula,
          empresa_id:  emp.empresa_id,
          codigo_barras: emp.codigo_barras,
          activo:       0,
          aplica_subsidio: 0,
          id_ubicacion_empleado: emp.id_ubicacion_empleado,
          sincronizado: emp.sincronizado,
          codigo_qr:    emp.codigo_qr,
          monedero_id:  emp.monedero_id,
          max_asistencias_por_dia: emp.max_asistencias_por_dia
        }, 'inactivate');

        // 5b) inactivar monedero
        const [mR]: any = await conn.query(
          `UPDATE monederos
             SET activo     = 0,
                 updated_at = NOW()
           WHERE empleado_id = ?`,
          [emp.id]
        );
        if (mR.affectedRows) {
          report.monederosInactivated++;
          await this.logHistorico(conn, {
            empleado_id: emp.id,
            nombre:      emp.nombre,
            cedula:      emp.cedula,
            empresa_id:  emp.empresa_id,
            codigo_barras: emp.codigo_barras,
            activo:       0,
            aplica_subsidio: 0,
            id_ubicacion_empleado: emp.id_ubicacion_empleado,
            sincronizado: emp.sincronizado,
            codigo_qr:    emp.codigo_qr,
            monedero_id:  emp.monedero_id,
            max_asistencias_por_dia: emp.max_asistencias_por_dia
          }, 'wallet_inactivate');
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    return report;
  }

  private static async logHistorico(
    conn: any,
    emp: {
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
    },
    action:
      | 'create'
      | 'update'
      | 'inactivate'
      | 'reactivate'
      | 'wallet_create'
      | 'wallet_reactivate'
      | 'wallet_inactivate'
  ) {
    await conn.query(
      `INSERT INTO empleados_historico
        (empleado_id, nombre, cedula, empresa_id, codigo_barras,
         activo, aplica_subsidio, id_ubicacion_empleado,
         sincronizado, codigo_qr, monedero_id,
         max_asistencias_por_dia, action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emp.empleado_id,
        emp.nombre,
        emp.cedula,
        emp.empresa_id,
        emp.codigo_barras,
        emp.activo,
        emp.aplica_subsidio,
        emp.id_ubicacion_empleado,
        emp.sincronizado,
        emp.codigo_qr,
        emp.monedero_id,
        emp.max_asistencias_por_dia,
        action,
      ]
    );
  }
}
