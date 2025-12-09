import { getPool } from '../../config/db_controlcomidas';

export class Reporte {
  // Método para listar todos los reportes
  static async listar(): Promise<any[]> {
    const pool = getPool('local');

    try {
      const [rows]: [any[], any] = await pool.query('SELECT * FROM reportes');
      return rows;
    } catch (error) {
      console.error('Error al listar reportes:', error);
      throw new Error('Error al listar reportes');
    }
  }

  /**
   * Genera reporte de pases a comedor por empleado o detalle de registros.
   * - empresaId: filtra registros de esta empresa
   * - fechaInicio, fechaFin: 'YYYY-MM-DD'
   * - grouped: true → totales por empleado; false → detalle de cada pase
   */
  static async generarPorEmpleado(
  empresaId: number,
  fechaInicio: string,
  fechaFin: string,
  grouped: boolean
): Promise<any[]> {
  const conn = await getPool('local');

  if (grouped) {
    // Totales por empleado incluyendo cero registros
    const sql = `
      SELECT
        e.id               AS empleado_id,
        e.nombre           AS nombre_empleado,
        COUNT(a.id)        AS total_comidas
      FROM empleados e
      LEFT JOIN asistencias a
        ON a.empleado_id = e.id
        AND DATE(a.fecha) BETWEEN ? AND ?
        AND a.empresa_id = ?
      WHERE e.empresa_id = ?
      GROUP BY e.id, e.nombre
      ORDER BY e.nombre
    `;
    const [rows] = await conn.query(sql, [
      fechaInicio,
      fechaFin,
      empresaId,
      empresaId
    ]);
    return rows as any[];
  } else {
    // Detalle de cada pase (igual que antes)
    const sql = `
      SELECT
        a.id,
        a.empleado_id,
        e.nombre           AS nombre_empleado,
        a.fecha,
        a.horario,
        a.metodo
      FROM asistencias a
      JOIN empleados e
        ON a.empleado_id = e.id
      WHERE a.empresa_id = ?
        AND DATE(a.fecha) BETWEEN ? AND ?
      ORDER BY a.fecha ASC
    `;
    const [rows] = await conn.query(sql, [empresaId, fechaInicio, fechaFin]);
    return rows as any[];
  }
}


  // Método para crear un nuevo reporte
  static async crear(
    fecha_inicio: string,
    fecha_fin: string,
    total_comidas: number,
    usuario_id: number,
    empresa_id: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');

    try {
      const [result]: [any, any] = await conn.query(
        `INSERT INTO reportes (fecha_generacion, fecha_inicio, fecha_fin, total_comidas, usuario_id, empresa_id, created_at, updated_at) VALUES (NOW(), ?, ?, ?, ?, ?, NOW(), NOW())`,
        [fecha_inicio, fecha_fin, total_comidas, usuario_id, empresa_id]
      );

      return {
        success: true,
        data: {
          id: (result as any).insertId,
          fecha_inicio,
          fecha_fin,
          total_comidas,
          usuario_id,
          empresa_id,
        },
      };
    } catch (error: any) {
      console.error('Error al crear reporte:', error);
      return { success: false, error: 'Error al crear el reporte' };
    }
  }

  // Método para editar un reporte
  static async editar(
    id: number,
    campos: {
      fecha_inicio?: string;
      fecha_fin?: string;
      total_comidas?: number;
      usuario_id?: number;
      empresa_id?: number;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');

    try {
      const [result] = await conn.query(
        `UPDATE reportes SET ? WHERE id = ?`,
        [campos, id]
      );

      if ((result as any).affectedRows === 0) {
        return { success: false, error: 'Reporte no encontrado' };
      }

      return { success: true, data: { id, ...campos } };
    } catch (error: any) {
      console.error('Error al editar reporte:', error);
      return { success: false, error: 'Error al editar reporte' };
    }
  }

  // Método para eliminar un reporte
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getPool('local');

    try {
      const [result] = await conn.query(
        `DELETE FROM reportes WHERE id = ?`,
        [id]
      );

      if ((result as any).affectedRows === 0) {
        return { success: false, error: 'Reporte no encontrado' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar reporte:', error);
      return { success: false, error: 'Error al eliminar reporte' };
    }
  }
}
