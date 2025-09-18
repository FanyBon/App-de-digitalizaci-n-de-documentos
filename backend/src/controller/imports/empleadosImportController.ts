import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import { EmpleadoImportModel, EmpleadoImportDTO } from '../../models/imports/EmpleadoImportModel';

export const importarEmpleados = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({ error: 'Archivo CSV requerido.' });
    return;
  }

  const filePath = req.file.path;
  const dtos: EmpleadoImportDTO[] = [];

  fs.createReadStream(filePath)
    .pipe(csvParser({ separator: ',', skipLines: 0 }))
    .on('data', (row: any) => {
      // 1) Mostrar la fila cruda
      console.log('RAW ROW:', row);

      // 2) Mapea encabezados con y sin tilde
      const rawEmpresa = row['Compañía'] ?? row['Compania'] ?? '';
      const empresaIdNum = Number(String(rawEmpresa).trim());
      const ubicRaw = row['Ubicación del Colaborador'] 
                      ?? row['Ubicacion del Colaborador'] 
                      ?? '';
      
      // 3) Construye el DTO
      const dto: EmpleadoImportDTO = {
        clave: String(row['Clave del Empleado'] || '').trim(),
        empresa_id: isNaN(empresaIdNum) ? 0 : empresaIdNum,
        id_ubicacion_empleado: ubicRaw.trim() || undefined
      };

      // 4) Mostrar el DTO antes de agregarse al batch
      console.log('BUILT DTO:', dto);

      dtos.push(dto);
    })
    .on('end', async () => {
      try {
        const report = await EmpleadoImportModel.processBatch(dtos);
        res.status(200).json(report);
      } catch (err) {
        next(err);
      } finally {
        fs.unlinkSync(filePath);
      }
    })
    .on('error', err => next(err));
};
