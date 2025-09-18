import { getConnection } from '../../config/db_controlcomidas';

export interface SubsidioInterface {
  id?: number;
  nombre: string;
  porcentaje: number;
  descripcion: string;
  empresa_id: number;
  activo: number;
  created_at?: Date;
  updated_at?: Date;
}

export class Subsidio {
  // Validar si ya existe un subsidio con el mismo nombre. Excluye un ID en edición.
  static async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    const conn = await getConnection();
    try {
      let query = 'SELECT id FROM subsidios WHERE nombre = ?';
      const params: any[] = [nombre];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const [rows]: [any[], any] = await conn.query(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error('Error en validación de unicidad de subsidios:', error);
      throw new Error('Error al validar subsidio');
    }
  }

  // Listar todos los subsidios
  static async listar(): Promise<SubsidioInterface[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM subsidios');
      return rows;
    } catch (error) {
      console.error('Error al listar subsidios:', error);
      throw new Error('Error al listar subsidios');
    }
  }

  // Obtener un subsidio por ID
  static async obtenerPorId(id: number): Promise<SubsidioInterface | null> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM subsidios WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener subsidio:', error);
      throw new Error('Error al obtener subsidio');
    }
  }

  // Crear un nuevo subsidio con validación de nombre único
  static async crear(subsidio: SubsidioInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    try {
      const existe = await Subsidio.existeNombre(subsidio.nombre);
      if (existe) {
        return { success: false, error: 'Ya existe un subsidio con ese nombre' };
      }
    } catch (error: any) {
      return { success: false, error: 'Error en validación de subsidio' };
    }

    try {
      const [result]: any = await conn.query(
        `INSERT INTO subsidios (nombre, porcentaje, descripcion, empresa_id, activo, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [subsidio.nombre, subsidio.porcentaje, subsidio.descripcion, subsidio.empresa_id, subsidio.activo]
      );

      return {
        success: true,
        data: { id: result.insertId, ...subsidio, created_at: new Date(), updated_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear subsidio:', error);
      return { success: false, error: 'Error al crear el subsidio' };
    }
  }

  // Editar un subsidio con validación de nombre único
  static async editar(
    id: number,
    data: Partial<SubsidioInterface>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getConnection();
    if (data.nombre) {
      try {
        const existe = await Subsidio.existeNombre(data.nombre, id);
        if (existe) {
          return { success: false, error: 'Ya existe un subsidio con ese nombre' };
        }
      } catch (error: any) {
        return { success: false, error: 'Error en validación de subsidio' };
      }
    }

    try {
      const [result]: any = await conn.query(`UPDATE subsidios SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Subsidio no encontrado' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar subsidio:', error);
      return { success: false, error: 'Error al editar el subsidio' };
    }
  }

  // Eliminar un subsidio
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();
    try {
      const [result]: any = await conn.query(`DELETE FROM subsidios WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Subsidio no encontrado' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar subsidio:', error);
      return { success: false, error: 'Error al eliminar el subsidio' };
    }
  }
}
