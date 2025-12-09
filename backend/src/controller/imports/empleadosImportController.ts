// src/controllers/imports/empleadosImportController.ts
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import { EmpleadoImportModel, EmpleadoImportDTO } from '../../models/imports/EmpleadoImportModel';

/** Helper: Extraer contexto de auditoría */
function getAuditoriaContext(req: Request, nombreArchivo: string) {
  return {
    usuario_id: req.user!.id,
    usuario_nombre: req.user!.nombre_usuario,
    nombre_archivo: nombreArchivo,
    ip: req.ip || req.socket.remoteAddress,
    user_agent: req.get('user-agent')
  };
}

/**
 * POST /api/imports/empleados
 * Importar empleados desde CSV
 */
export const importarEmpleados = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({ error: 'Archivo CSV requerido' });
    return;
  }

  const filePath = req.file.path;
  const nombreArchivo = req.file.originalname || 'archivo.csv';
  const dtos: EmpleadoImportDTO[] = [];

  console.log(`📁 Iniciando importación de: ${nombreArchivo}`);
  console.log(`👤 Usuario: ${req.user!.nombre_usuario} (ID: ${req.user!.id})`);

  fs.createReadStream(filePath)
    .pipe(csvParser({ 
      separator: ',', 
      skipLines: 0,
      mapHeaders: ({ header }) => {
        return header
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, '_');
      }
    }))
    .on('data', (row: any) => {
      const rawEmpresa = row['compania'] ?? row['compañia'] ?? '';
      const empresaIdNum = Number(String(rawEmpresa).trim());
      
      const ubicRaw = row['ubicacion_del_colaborador'] ?? '';
      const claveRaw = row['clave_del_empleado'] ?? '';
      
      const dto: EmpleadoImportDTO = {
        clave: String(claveRaw).trim(),
        empresa_id: isNaN(empresaIdNum) ? 0 : empresaIdNum,
        id_ubicacion_empleado: ubicRaw.trim() || undefined
      };

      if (dto.clave) {
        dtos.push(dto);
      } else {
        console.warn('⚠️ Fila sin clave, se omite:', row);
      }
    })
    .on('end', async () => {
      try {
        console.log(`📊 Total registros leídos: ${dtos.length}`);
        
        const report = await EmpleadoImportModel.processBatchWithAudit(
          dtos,
          getAuditoriaContext(req, nombreArchivo)
        );

        console.log(`✅ IMPORTACIÓN COMPLETADA:
          - Creados: ${report.created}
          - Actualizados: ${report.updated}
          - Reactivados: ${report.reactivated}
          - Omitidos: ${report.skipped}
          - Inactivados: ${report.inactivated}
          - Errores: ${report.errors.length}
        `);

        res.status(200).json({
          mensaje: 'Importación completada',
          archivo: nombreArchivo,
          ...report
        });

      } catch (err: any) {
        console.error('❌ Error procesando batch:', err);
        res.status(500).json({ 
          error: 'Error al procesar importación',
          detalle: err.message 
        });
      } finally {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Archivo temporal eliminado: ${filePath}`);
        } catch (unlinkErr) {
          console.error('Error eliminando archivo temporal:', unlinkErr);
        }
      }
    })
    .on('error', err => {
      console.error('❌ Error leyendo CSV:', err);
      
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.error('Error eliminando archivo temporal:', unlinkErr);
      }
      
      res.status(500).json({ 
        error: 'Error al leer archivo CSV',
        detalle: err.message 
      });
    });
};

/**
 * GET /api/imports/empleados/historial
 * Obtener historial de importaciones con filtros de fecha
 * 
 * Query params:
 * - periodo: 'hoy' | '15dias' | '30dias' | 'personalizado'
 * - fecha_desde: ISO date (solo si periodo=personalizado)
 * - fecha_hasta: ISO date (solo si periodo=personalizado)
 * - usuario_id: number (opcional)
 * - estado: 'exitoso' | 'con_errores' | 'fallido' (opcional)
 * - limit: number (default: 50)
 */
export const getHistorialImportaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: any = {};

    // ⭐ NUEVO: Manejo de periodos predefinidos
    const periodo = req.query.periodo as string;
    
    if (periodo) {
      const ahora = new Date();
      let fechaDesde: Date;

      switch (periodo.toLowerCase()) {
        case 'hoy':
          // Desde las 00:00:00 de hoy
          fechaDesde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
          filters.fecha_desde = fechaDesde;
          filters.fecha_hasta = ahora;
          break;

        case '15dias':
          // Últimos 15 días
          fechaDesde = new Date(ahora);
          fechaDesde.setDate(ahora.getDate() - 15);
          fechaDesde.setHours(0, 0, 0, 0);
          filters.fecha_desde = fechaDesde;
          filters.fecha_hasta = ahora;
          break;

        case '30dias':
          // Últimos 30 días
          fechaDesde = new Date(ahora);
          fechaDesde.setDate(ahora.getDate() - 30);
          fechaDesde.setHours(0, 0, 0, 0);
          filters.fecha_desde = fechaDesde;
          filters.fecha_hasta = ahora;
          break;

        case 'personalizado':
          // Rango personalizado (validar que vengan las fechas)
          if (req.query.fecha_desde) {
            filters.fecha_desde = new Date(req.query.fecha_desde as string);
          }
          
          if (req.query.fecha_hasta) {
            filters.fecha_hasta = new Date(req.query.fecha_hasta as string);
          }

          // Validar que las fechas sean válidas
          if (filters.fecha_desde && isNaN(filters.fecha_desde.getTime())) {
            res.status(400).json({ error: 'fecha_desde inválida. Formato esperado: YYYY-MM-DD' });
            return;
          }

          if (filters.fecha_hasta && isNaN(filters.fecha_hasta.getTime())) {
            res.status(400).json({ error: 'fecha_hasta inválida. Formato esperado: YYYY-MM-DD' });
            return;
          }

          // Validar que fecha_desde no sea mayor que fecha_hasta
          if (filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta) {
            res.status(400).json({ error: 'fecha_desde no puede ser mayor que fecha_hasta' });
            return;
          }
          break;

        default:
          res.status(400).json({ 
            error: 'Periodo inválido. Opciones: hoy, 15dias, 30dias, personalizado' 
          });
          return;
      }
    }

    // Filtro por usuario
    if (req.query.usuario_id) {
      filters.usuario_id = Number(req.query.usuario_id);
    }

    // Filtro por estado
    if (req.query.estado) {
      const estadoValido = ['exitoso', 'con_errores', 'fallido'].includes(req.query.estado as string);
      
      if (!estadoValido) {
        res.status(400).json({ 
          error: 'Estado inválido. Opciones: exitoso, con_errores, fallido' 
        });
        return;
      }
      
      filters.estado = req.query.estado as 'exitoso' | 'con_errores' | 'fallido';
    }

    // Límite de resultados
    filters.limit = req.query.limit ? Number(req.query.limit) : 50;

    // Validar limit
    if (filters.limit < 1 || filters.limit > 500) {
      res.status(400).json({ error: 'limit debe estar entre 1 y 500' });
      return;
    }

    const historial = await EmpleadoImportModel.getHistorial(filters);

    // ⭐ NUEVO: Información adicional en la respuesta
    const response: any = {
      total: historial.length,
      filtros_aplicados: {
        periodo: periodo || 'sin_filtro',
        fecha_desde: filters.fecha_desde?.toISOString() || null,
        fecha_hasta: filters.fecha_hasta?.toISOString() || null,
        usuario_id: filters.usuario_id || null,
        estado: filters.estado || null,
        limit: filters.limit
      },
      data: historial
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('Error en getHistorialImportaciones:', error);
    res.status(500).json({ error: 'Error al obtener historial de importaciones' });
  }
};