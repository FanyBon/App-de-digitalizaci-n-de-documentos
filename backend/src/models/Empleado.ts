// src/models/Empleado.ts
import { getConnection } from '../config/db_controlcomidas';
import { v4 as uuidv4 } from 'uuid';

export class Empleado {
  // Crea un empleado, ahora con max_asistencias_por_dia
  static async crear(
    nombre: string,
    cedula: string,
    empresa_id: number,
    codigo_barras?: string,
    codigo_qr?: string,
    activo: boolean = true,
    max_asistencias_por_dia: number = 1   // <-- Nuevo parámetro
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    // Generar valores por defecto
    const codigoBarrasFinal = codigo_barras || uuidv4();
    const codigoQRFinal = codigo_qr || `${nombre} - ${cedula} - ${empresa_id} - ${codigoBarrasFinal}`;

    try {
      const [result]: any = await conn.query(
        `INSERT INTO empleados
           (nombre, cedula, empresa_id, codigo_barras, codigo_qr, activo,
            max_asistencias_por_dia, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          nombre,
          cedula,
          empresa_id,
          codigoBarrasFinal,
          codigoQRFinal,
          activo ? 1 : 0,
          max_asistencias_por_dia       // <-- lo incluimos en el INSERT
        ]
      );

      return {
        success: true,
        data: {
          id: result.insertId,
          nombre,
          cedula,
          empresa_id,
          codigo_barras: codigoBarrasFinal,
          codigo_qr: codigoQRFinal,
          activo,
          max_asistencias_por_dia
        }
      };
    } catch (error: any) {
      console.error('Error al crear empleado:', error);
      return { success: false, error: 'Error al crear empleado' };
    }
  }

  //Lista todos los empleados
  static async listar(): Promise<any[]> {
    const conn = await getConnection();
    const [empleados]: any[] = await conn.query('SELECT * FROM empleados');
    return empleados;
  }

  //Actualiza campos de empleado, incluyendo max_asistencias_por_dia
  static async actualizar(
    id: number,
    campos: {
      nombre?: string;
      cedula?: string;
      empresa_id?: number;
      codigo_barras?: string;
      codigo_qr?: string;
      activo?: boolean;
      monedero_id?: number;
      max_asistencias_por_dia?: number;  // <-- Permitimos actualizarlo
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();

    try {
      const [result]: any = await conn.query(
        `UPDATE empleados SET ? WHERE id = ?`,
        [campos, id]
      );
      if (result.affectedRows === 0) {
        return { success: false, error: 'Empleado no encontrado' };
      }
      return { success: true, data: { id, ...campos } };
    } catch (error: any) {
      console.error('Error al actualizar empleado:', error);
      return { success: false, error: 'Error al actualizar empleado' };
    }
  }

  //Elimina un empleado
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(
        `DELETE FROM empleados WHERE id = ?`,
        [id]
      );
      if (result.affectedRows === 0) {
        return { success: false, error: 'Empleado no encontrado' };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar empleado:', error);
      return { success: false, error: 'Error al eliminar empleado' };
    }
  }

  //Busca empleados por nombre, cédula, barras o QR
  static async buscar(q: string): Promise<any[]> {
    const conn = await getConnection();
    const likeQuery = `%${q}%`;
    try {
      const [rows]: any[] = await conn.query(
        `SELECT * FROM empleados
         WHERE nombre LIKE ? OR cedula LIKE ?
           OR codigo_barras LIKE ? OR codigo_qr LIKE ?`,
        [likeQuery, likeQuery, likeQuery, likeQuery]
      );
      return rows;
    } catch (error) {
      console.error('Error al buscar empleados:', error);
      throw error;
    }
  }
}
