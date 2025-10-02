import { getConnection } from '../../config/db_controlcomidas';

export interface ImpuestoInterface {
  id?: number;
  nombre: string;
  descripcion?: string;
  porcentaje: number;
  activo?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class ImpuestoModel {
  static async listar(): Promise<ImpuestoInterface[]> {
    const conn = await getConnection();
    const [rows]: any[] = await conn.query(
      'SELECT * FROM impuestos WHERE activo = 1'
    );
    return rows;
  }

  static async obtenerPorId(id: number): Promise<ImpuestoInterface | null> {
    const conn = await getConnection();
    const [rows]: any[] = await conn.query(
      'SELECT * FROM impuestos WHERE id = ? AND activo = 1',
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  static async crear(
    data: ImpuestoInterface
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    const sql = `
      INSERT INTO impuestos
        (nombre, descripcion, porcentaje, activo, created_at, updated_at)
      VALUES (?, ?, ?, 1, NOW(), NOW())
    `;
    const params = [
      data.nombre,
      data.descripcion || '',
      data.porcentaje
    ]; 
    const [res]: any = await conn.query(sql, params);
    return {
      success: true,
      data: { id: res.insertId, ...data, activo: 1 }
    };
  }

  static async actualizar(
    id: number,
    data: Partial<ImpuestoInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    const sql = `
      UPDATE impuestos
         SET nombre      = ?,
             descripcion = ?,
             porcentaje  = ?,
             updated_at  = NOW()
       WHERE id = ? AND activo = 1
    `;
    const params = [
      data.nombre,
      data.descripcion || '',
      data.porcentaje,
      id
    ];
    const [res]: any = await conn.query(sql, params);
    if (res.affectedRows === 0) {
      return { success: false, error: 'Impuesto no encontrado o inactivo' };
    }
    const actual = await this.obtenerPorId(id);
    return { success: true, data: actual };
  }

  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    const sql = `
      UPDATE impuestos
         SET activo     = 0,
             updated_at = NOW()
       WHERE id = ?
    `;
    const [res]: any = await conn.query(sql, [id]);
    if (res.affectedRows === 0) {
      return { success: false, error: 'Impuesto no encontrado' };
    }
    return { success: true };
  }
}
