// src/models/usuarios_plataforma/UsuarioRol.ts
import { getConnection } from '../../config/db_controlcomidas';

export class UsuarioRol {
  // 1. Listar roles de un usuario
  static async listarRoles(usuarioId: number): Promise<any[]> {
    const conn = await getConnection();
    const [rows]: any = await conn.query(
      `SELECT r.*
         FROM roles r
         JOIN usuario_roles ur
           ON ur.rol_id = r.id
        WHERE ur.usuario_id = ?`,
      [usuarioId]
    );
    return rows;
  }

  // 2. Asignar un rol a un usuario
  static async asignarRol(
    usuarioId: number,
    rolId: number
  ): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection();

    try {
      await conn.query(
        `INSERT IGNORE INTO usuario_roles
           (usuario_id, rol_id, assigned_at)
         VALUES (?, ?, NOW())`,
        [usuarioId, rolId]
      );
      return { success: true };
    } catch (err: any) {
      console.error('Error al asignar rol:', err);
      return { success: false, error: 'Error al asignar el rol' };
    }
  }

  // 3. Quitar un rol de un usuario
  static async quitarRol(usuarioId: number, rolId: number): Promise<void> {
    const conn = await getConnection();
    await conn.query(
      `DELETE FROM usuario_roles
         WHERE usuario_id = ? AND rol_id = ?`,
      [usuarioId, rolId]
    );
  }
}