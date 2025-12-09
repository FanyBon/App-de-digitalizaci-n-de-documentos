import { getPool } from '../../config/db_controlcomidas';

export class Asistencia {
  // Método para obtener todas las asistencias
  static async listar(): Promise<any[]> {
    const pool = getPool('local');

    try {
      const [rows]: [any[], any] = await pool.query('SELECT * FROM asistencias');
      return rows;
    } catch (error) {
      console.error('Error al listar asistencias:', error);
      throw new Error('Error al listar asistencias');
    }
  }

  static async listarPorEmpresaYRango(
    empresaId: number,
    fechaInicio: string,
    fechaFin: string
  ): Promise<any[]> {
    const pool = getPool('local');
    try {
      const [rows]: [any[], any] = await pool.query(
        `SELECT *
           FROM asistencias
          WHERE empresa_id = ?
            AND DATE(fecha) BETWEEN ? AND ?
          ORDER BY fecha ASC`,
        [empresaId, fechaInicio, fechaFin]
      );
      return rows;
    } catch (error) {
      console.error('Error al listar asistencias por empresa y rango:', error);
      throw new Error('Error al listar asistencias por rango');
    }
  }

  // Método para agregar una nueva asistencia
  static async crear(
    empleado_id: number,
    fecha: string,
    horario: 'desayuno' | 'almuerzo' | 'cena',
    metodo: 'qr' | 'barras',
    empresa_id: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pool = getPool('local');

    try {
      const [result]: [any, any] = await pool.query(
        `INSERT INTO asistencias (empleado_id, fecha, horario, metodo, empresa_id, created_at, updated_at, sincronizado) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
        [empleado_id, fecha, horario, metodo, empresa_id]
      );

      return {
        success: true,
        data: {
          id: (result as any).insertId,
          empleado_id,
          fecha,
          horario,
          metodo,
          empresa_id
        },
      };
    } catch (error: any) {
      console.error('Error al crear asistencia:', error);
      return { success: false, error: 'Error al crear la asistencia' };
    }
  }

  // Método para editar una asistencia
  static async editar(
    id: number,
    campos: {
      empleado_id?: number;
      fecha?: string;
      horario?: 'desayuno' | 'almuerzo' | 'cena';
      metodo?: 'qr' | 'barras';
      empresa_id?: number;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pool = getPool('local');

    try {
      const [result] = await pool.query(
        `UPDATE asistencias SET ? WHERE id = ?`,
        [campos, id]
      );

      if ((result as any).affectedRows === 0) {
        return { success: false, error: 'Asistencia no encontrada' };
      }

      return { success: true, data: { id, ...campos } };
    } catch (error: any) {
      console.error('Error al editar asistencia:', error);
      return { success: false, error: 'Error al editar la asistencia' };
    }
  }

  // Método para eliminar una asistencia
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
        const pool = getPool('local');

    try {
      const [result] = await pool.query(
        `DELETE FROM asistencias WHERE id = ?`,
        [id]
      );

      if ((result as any).affectedRows === 0) {
        return { success: false, error: 'Asistencia no encontrada' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar asistencia:', error);
      return { success: false, error: 'Error al eliminar la asistencia' };
    }
  }

}
