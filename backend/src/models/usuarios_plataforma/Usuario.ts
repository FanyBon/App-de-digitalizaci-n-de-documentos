import bcrypt from 'bcrypt';
import { getConnection } from '../../config/db_controlcomidas';

type EditCampos = {
  email?: string
  nombre_usuario?: string
  password?: string
  empresa_id?: number
  roles?: number[]
}

export class Usuario {
  //Retorna todos los usuarios.
  static async listar(): Promise<any[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM usuarios');
      return rows;
    } catch (err) {
      console.error('Error al listar usuarios:', err);
      throw new Error('Error al listar usuarios');
    }
  }

  //Retorna solo los usuarios de una empresa dada.
  static async listarPorEmpresa(empresa_id: number): Promise<any[]> {
    const conn = await getConnection();
    try {
      const [rows]: [any[], any] = await conn.query(
        'SELECT * FROM usuarios WHERE empresa_id = ?',
        [empresa_id]
      );
      return rows;
    } catch (err) {
      console.error('Error al listar usuarios por empresa:', err);
      throw new Error('Error al listar usuarios por empresa');
    }
  }

  static async crear(
    email: string,
    nombre_usuario: string,
    password: string,
    empresa_id: number
  ): Promise<{ success: boolean; data?: Usuario; error?: string }> {
    const conn = await getConnection();

    try {
      const hashed = await bcrypt.hash(password, 10);
      const [result]: any = await conn.query(
        `INSERT INTO usuarios
           (email, nombre_usuario, password, empresa_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [email, nombre_usuario, hashed, empresa_id]
      );

      return {
        success: true,
        data: {
          id: result.insertId,
          email,
          nombre_usuario,
          empresa_id
        }
      };
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      return { success: false, error: 'Error al crear el usuario' };
    }
  }

  //Edita un usuario.
  // src/models/usuarios_plataforma/Usuario.ts
static async editarConRoles(
  id: number,
  campos: {
    email?: string
    nombre_usuario?: string
    password?: string
    empresa_id?: number
    roles?: number[]
    perfiles?: number[]      // <— incluir perfiles
  }
): Promise<{ success: boolean; data?: any; roles?: number[]; perfiles?: number[]; error?: string }> {
  const conn = await getConnection()
  await conn.beginTransaction()

  try {
    // 1) Hash password si viene
    if (campos.password) {
      campos.password = await bcrypt.hash(campos.password, 10)
    }

    // 2) Separamos roles y perfiles del resto de campos
    const { roles, perfiles, ...rawFields } = campos

    // 3) Filtrar sólo propiedades definidas para UPDATE
    const userFields: Record<string, any> = {}
    Object.entries(rawFields).forEach(([key, value]) => {
      if (value !== undefined) {
        userFields[key] = value
      }
    })

    // 4) Ejecutar UPDATE si hay algo que cambiar
    if (Object.keys(userFields).length) {
      const [upd]: any = await conn.query(
        'UPDATE usuarios SET ? WHERE id = ?',
        [userFields, id]
      )
      if (upd.affectedRows === 0) {
        await conn.rollback()
        return { success: false, error: 'Usuario no encontrado' }
      }
    }

    // 5) Sincronizar roles
    if (Array.isArray(roles)) {
      await conn.query('DELETE FROM usuario_roles WHERE usuario_id = ?', [id])
      if (roles.length) {
        const values = roles.map(rId => [id, rId, new Date()])
        await conn.query(
          'INSERT INTO usuario_roles (usuario_id, rol_id, assigned_at) VALUES ?',
          [values]
        )
      }
    }

    // 6) Sincronizar perfiles
    if (Array.isArray(perfiles)) {
      await conn.query('DELETE FROM usuario_perfil WHERE usuario_id = ?', [id])
      if (perfiles.length) {
        const values = perfiles.map(pId => [id, pId, new Date()])
        await conn.query(
          'INSERT INTO usuario_perfil (usuario_id, perfil_id, assigned_at) VALUES ?',
          [values]
        )
      }
    }

    await conn.commit()
    return {
      success: true,
      data: { id, ...userFields },
      roles:    roles   ?? [],
      perfiles: perfiles ?? []
    }
  } catch (err: any) {
    await conn.rollback()
    console.error('Error editarConRoles:', err)
    return { success: false, error: 'Error al editar usuario, roles y perfiles' }
  }
}


  static async eliminar(
    id: number
  ): Promise<{ success: boolean; error?: string }> {
    const conn = await getConnection()
    await conn.beginTransaction()

    try {
      // 1) Borrar roles
      await conn.query(
        'DELETE FROM usuario_roles WHERE usuario_id = ?',
        [id]
      )

      // 2) Borrar perfiles
      await conn.query(
        'DELETE FROM usuario_perfiles WHERE usuario_id = ?',
        [id]
      )

      // 3) Borrar usuario
      const [result]: any = await conn.query(
        'DELETE FROM usuarios WHERE id = ?',
        [id]
      )
      if (result.affectedRows === 0) {
        await conn.rollback()
        return { success: false, error: 'Usuario no encontrado' }
      }

      await conn.commit()
      return { success: true }
    } catch (err: any) {
      await conn.rollback()
      console.error('Error al eliminar usuario y dependencias:', err)
      return { success: false, error: 'Error al eliminar usuario' }
    }
  }
}