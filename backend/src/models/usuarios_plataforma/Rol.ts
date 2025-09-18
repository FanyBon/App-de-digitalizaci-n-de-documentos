import { getConnection } from '../../config/db_controlcomidas';

export interface RolData {
    id: number;
    nombre: string;
}

export class Rol {
    //Lista todos los roles.
    static async listar(): Promise<RolData[]> {
        const conn = await getConnection();
        const [rows]: [any[], any] = await conn.query(
            'SELECT id, nombre FROM roles ORDER BY nombre'
        );
        return rows;
    }

    //Obtiene un rol por su ID.
    static async obtenerPorId(id: number): Promise<RolData | null> {
        const conn = await getConnection();
        const [rows]: [any[], any] = await conn.query(
            'SELECT id, nombre FROM roles WHERE id = ?',
            [id]
        );
        return rows.length ? rows[0] : null;
    }

    //Crea un nuevo rol.
    static async crear(nombre: string): Promise<RolData> {
        const conn = await getConnection();
        const [result]: any = await conn.query(
            'INSERT INTO roles (nombre) VALUES (?)',
            [nombre]
        );
        return { id: result.insertId, nombre };
    }

    //Actualiza el nombre de un rol.
    static async editar(id: number, nombre: string): Promise<boolean> {
        const conn = await getConnection();
        const [result]: any = await conn.query(
            'UPDATE roles SET nombre = ? WHERE id = ?',
            [nombre, id]
        );
        return result.affectedRows > 0;
    }

    //Elimina un rol por su ID.
    static async eliminar(id: number): Promise<boolean> {
        const conn = await getConnection();
        const [result]: any = await conn.query(
            'DELETE FROM roles WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}
