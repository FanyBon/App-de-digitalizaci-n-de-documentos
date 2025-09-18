// src/models/usuarios_plataforma/UsuarioPerfil.ts
import { getConnection } from '../../config/db_controlcomidas';

export class UsuarioPerfil {
  static async listarTodos(): Promise<any[]> {
    const conn = await getConnection();
    const [rows]: any = await conn.query(
      `SELECT usuario_id,
              perfil_id,
              assigned_at
         FROM usuario_perfiles
        ORDER BY assigned_at DESC`
    );
    return rows;
  }

  static async listarPorUsuario(usuarioId: number): Promise<any[]> {
    const conn = await getConnection();
    const [rows]: any = await conn.query(
      `SELECT up.usuario_id,
              up.perfil_id,
              up.assigned_at,
              p.nombre AS perfil_nombre
         FROM usuario_perfiles up
         JOIN perfiles p
           ON up.perfil_id = p.id
        WHERE up.usuario_id = ?
        ORDER BY up.assigned_at DESC`,
      [usuarioId]
    );
    return rows;
  }

  static async asignarPerfil(usuarioId: number, perfilId: number): Promise<void> {
    const conn = await getConnection();
    await conn.query(
      `INSERT IGNORE INTO usuario_perfiles
         (usuario_id, perfil_id, assigned_at)
       VALUES (?, ?, NOW())`,
      [usuarioId, perfilId]
    );
  }

  static async quitarPerfil(usuarioId: number, perfilId: number): Promise<void> {
    const conn = await getConnection();
    await conn.query(
      `DELETE FROM usuario_perfiles
         WHERE usuario_id = ? AND perfil_id = ?`,
      [usuarioId, perfilId]
    );
  }
}
