import { getPool } from '../../config/db_controlcomidas';

export interface SubsidioInterface {
  id?: number;
  nombre: string;
  porcentaje?: number;
  monto_fijo?: number;
  descripcion?: string;
  tipo: 'porcentaje' | 'fijo';
  empresa_id: number;
  activo?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class Subsidio {

  /** Valida que tipo y campos porcentaje/monto_fijo sean consistentes */
  private static validarTipo(data: SubsidioInterface) {
    if (data.tipo === 'porcentaje') {
      if (data.porcentaje == null || data.monto_fijo != null) {
        throw new Error(
          'Tipo “porcentaje” requiere porcentaje != null y monto_fijo = NULL'
        );
      }
    } else {
      if (data.monto_fijo == null || data.porcentaje != null) {
        throw new Error(
          'Tipo “fijo” requiere monto_fijo != null y porcentaje = NULL'
        );
      }
    }
  }

  // Validar si ya existe un subsidio con el mismo nombre. Excluye un ID en edición.
  static async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    const conn = await getPool('local');
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
    const conn = await getPool('local');
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
    const conn = await getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM subsidios WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener subsidio:', error);
      throw new Error('Error al obtener subsidio');
    }
  }

  static async crear(
  subsidio: SubsidioInterface
): Promise<{ success: boolean; data?: SubsidioInterface; error?: string }> {
  // 1) Validar coherencia tipo / campos
  try {
    this.validarTipo(subsidio);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  // 2) Verificar unicidad de nombre
  try {
    const existe = await Subsidio.existeNombre(subsidio.nombre);
    if (existe) {
      return { success: false, error: 'Ya existe un subsidio con ese nombre' };
    }
  } catch (err: any) {
    return { success: false, error: 'Error en validación de nombre' };
  }

  // 3) Insertar en BD
  try {
    const conn = await getPool('local');
    const [result]: any = await conn.query(
      `INSERT INTO subsidios
         (nombre, porcentaje, monto_fijo, descripcion, tipo, empresa_id,
          activo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        subsidio.nombre,
        subsidio.porcentaje ?? null,
        subsidio.monto_fijo  ?? null,
        subsidio.descripcion || '',
        subsidio.tipo,
        subsidio.empresa_id
      ]
    );

    const creado: SubsidioInterface = {
      id: result.insertId,
      ...subsidio,
      activo: 1,
      created_at: new Date(),
      updated_at: new Date()
    };
    return { success: true, data: creado };
  } catch (err: any) {
    console.error('Error al crear subsidio:', err);
    return { success: false, error: 'Error al crear el subsidio' };
  }
}

static async editar(
  id: number,
  data: Partial<SubsidioInterface>
): Promise<{ success: boolean; data?: SubsidioInterface; error?: string }> {
  // 1) Leer existente
  let existente: SubsidioInterface | null;
  try {
    existente = await this.obtenerPorId(id);
    if (!existente) {
      return { success: false, error: 'Subsidio no encontrado' };
    }
  } catch {
    return { success: false, error: 'Error al obtener subsidio' };
  }

  // 2) Merge y validar tipo
  const merged: SubsidioInterface = { ...existente, ...data } as any;
  try {
    this.validarTipo(merged);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  // 3) Validar nombre único
  if (data.nombre) {
    try {
      const dup = await Subsidio.existeNombre(merged.nombre, id);
      if (dup) {
        return { success: false, error: 'Ya existe un subsidio con ese nombre' };
      }
    } catch {
      return { success: false, error: 'Error en validación de nombre' };
    }
  }

  // 4) Actualizar en BD
  try {
    const conn = await getPool('local');
    const [result]: any = await conn.query(
      `UPDATE subsidios
         SET nombre      = ?,
             porcentaje  = ?,
             monto_fijo  = ?,
             descripcion = ?,
             tipo        = ?,
             empresa_id  = ?,
             updated_at  = NOW()
       WHERE id = ?`,
      [
        merged.nombre,
        merged.porcentaje ?? null,
        merged.monto_fijo  ?? null,
        merged.descripcion || '',
        merged.tipo,
        merged.empresa_id,
        id
      ]
    );
    if (result.affectedRows === 0) {
      return { success: false, error: 'Subsidio no encontrado' };
    }
    return { success: true, data: merged };
  } catch (err: any) {
    console.error('Error al editar subsidio:', err);
    return { success: false, error: 'Error al editar el subsidio' };
  }
}

  // Eliminar un subsidio
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getPool('local');
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
