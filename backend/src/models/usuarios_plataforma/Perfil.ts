import { getConnection } from '../../config/db_controlcomidas';

export interface PerfilData {
  id: number;
  nombre: string;
  descripcion: string;
}

export class Perfil {
  /**
   * Lista todos los perfiles.
   */
  static async listar(): Promise<PerfilData[]> {
    const conn = await getConnection();
    const [rows]: [any[], any] = await conn.query(
      'SELECT id, nombre, descripcion FROM perfiles ORDER BY nombre'
    );
    return rows;
  }

  /**
   * Obtiene un perfil por su ID.
   */
  static async obtenerPorId(id: number): Promise<PerfilData | null> {
    const conn = await getConnection();
    const [rows]: [any[], any] = await conn.query(
      'SELECT id, nombre, descripcion FROM perfiles WHERE id = ?',
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Crea un nuevo perfil.
   */
  static async crear(
    nombre: string,
    descripcion: string
  ): Promise<PerfilData> {
    const conn = await getConnection();
    const [result]: any = await conn.query(
      'INSERT INTO perfiles (nombre, descripcion, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [nombre, descripcion]
    );
    return { id: result.insertId, nombre, descripcion };
  }

  /**
   * Actualiza un perfil.
   */
  static async editar(
    id: number,
    nombre: string,
    descripcion: string
  ): Promise<boolean> {
    const conn = await getConnection();
    const [result]: any = await conn.query(
      'UPDATE perfiles SET nombre = ?, descripcion = ?, updated_at = NOW() WHERE id = ?',
      [nombre, descripcion, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Elimina un perfil por su ID.
   */
  static async eliminar(id: number): Promise<boolean> {
    const conn = await getConnection();
    const [result]: any = await conn.query(
      'DELETE FROM perfiles WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}
