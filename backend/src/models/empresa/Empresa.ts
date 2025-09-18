import { getConnection } from '../../config/db_controlcomidas';

export class Empresa {
  // Obtener todas las empresas
  static async listar(): Promise<any[]> {
    const conn = await getConnection();

    try {
      // Especifica que el resultado será un arreglo (`any[]` o define un tipo más específico si lo tienes)
      const [rows]: [any[], any] = await conn.query('SELECT * FROM empresas');
      return rows; // Devuelve los registros
    } catch (error) {
      console.error('Error al listar empresas:', error);
      throw new Error('Error al listar empresas'); // Manejo del error
    }
  }

  // Crear una nueva empresa
static async crear(
  nombre: string,
  contacto: string,
  telefono: string,
  estatus: 'activo' | 'inactivo' | 'suspendido' = 'activo',
  parent_id?: number,
  costo_charola: number = 0,
  estimado_personas: number = 0
): Promise<{ success: boolean; data?: any; error?: string }> {
  const conn = await getConnection();

  try {
    const query = `INSERT INTO empresas (
      nombre, contacto, telefono, estatus, parent_id, costo_charola, estimado_personas,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

    const params = [
      nombre,
      contacto,
      telefono,
      estatus,
      parent_id ?? null,
      costo_charola,
      estimado_personas
    ];

    const [result]: [any, any] = await conn.query(query, params);

    return {
      success: true,
      data: {
        id: result.insertId,
        nombre,
        contacto,
        telefono,
        estatus,
        parent_id,
        costo_charola,
        estimado_personas
      },
    };
  } catch (error: any) {
    console.error('Error al crear empresa:', error);
    return { success: false, error: 'Error al crear la empresa' };
  }
}

// Editar una empresa
static async editar(
  id: number,
  campos: {
    nombre?: string;
    contacto?: string;
    telefono?: string;
    estatus?: 'activo' | 'inactivo' | 'suspendido';
    parent_id?: number;
    costo_charola?: number;
    estimado_personas?: number;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const conn = await getConnection();

  try {
    const [result] = await conn.query(
      `UPDATE empresas SET ? WHERE id = ?`,
      [campos, id]
    );

    if ((result as any).affectedRows === 0) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    return { success: true, data: { id, ...campos } };
  } catch (error: any) {
    console.error('Error al editar empresa:', error);
    return { success: false, error: 'Error al editar la empresa' };
  }
}

  // Método para eliminar una empresa
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();

    try {
      const [result] = await conn.query(
        `DELETE FROM empresas WHERE id = ?`,
        [id]
      );

      if ((result as any).affectedRows === 0) {
        return { success: false, error: 'Empresa no encontrada' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar empresa:', error);
      return { success: false, error: 'Error al eliminar la empresa' };
    }
  }
}
