// src/models/loggin/Auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../../config/db_controlcomidas';

// ⭐ INTERFACES
export interface ModuloHijo {
  id: number;
  codigo: string;
  nombre: string;
  icono?: string;
  ruta?: string;
  orden: number;
}

export interface ModuloPermitido {
  id: number;
  codigo: string;
  nombre: string;
  icono?: string;
  ruta?: string;
  orden: number;
  hijos: ModuloHijo[];
}

export interface AuthPayload {
  id: number;
  email: string;
  nombre_usuario: string;
  empresa_id: number;
  empresa_nombre: string;
  roles: string[];
  perfiles: string[];
}

export interface UbicacionDisponible {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface AuthResponse {
  token: string;
  user_id: number;
  nombre_usuario: string;
  empresa_id: number;
  empresa_nombre: string;
  roles: string[];
  perfiles: string[];
  ubicaciones_disponibles: UbicacionDisponible[];
  modulos_permitidos: ModuloPermitido[];
}

export class Auth {
  static async login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    const pool = getPool('local');

    // 1) Traer usuario + contraseña + empresa
    const [userRows]: any = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.nombre_usuario,
        u.password,
        u.empresa_id,
        e.nombre AS empresa_nombre
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.email = ? OR u.nombre_usuario = ?
      LIMIT 1
      `,
      [emailOrUsername, emailOrUsername]
    );

    const user = Array.isArray(userRows) && userRows.length ? userRows[0] : null;
    if (!user) {
      console.log(`AUTH: usuario no encontrado para '${emailOrUsername}'`);
      throw new Error('Usuario no encontrado');
    }

    // 2) Verificar contraseña
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`AUTH: credenciales inválidas para usuario id=${user.id} (${emailOrUsername})`);
      throw new Error('Credenciales inválidas');
    }

    // 3) Traer roles del usuario
    const [roleRows]: any = await pool.query(
      `
      SELECT r.nombre
      FROM roles r
      JOIN usuario_roles ur ON r.id = ur.rol_id
      WHERE ur.usuario_id = ? AND ur.activo = 1
      `,
      [user.id]
    );
    const roles: string[] = (roleRows || []).map((r: any) => r.nombre);

    // 4) Traer perfiles del usuario
    const [perfilRows]: any = await pool.query(
      `
      SELECT p.nombre, p.id
      FROM perfiles p
      JOIN usuario_perfiles up ON p.id = up.perfil_id
      WHERE up.usuario_id = ? AND up.activo = 1
      `,
      [user.id]
    );
    const perfiles: string[] = (perfilRows || []).map((p: any) => p.nombre);
    const perfilIds: number[] = (perfilRows || []).map((p: any) => p.id);

    // ⭐ 4.5) OBTENER MÓDULOS PERMITIDOS
    let modulos_permitidos: ModuloPermitido[] = [];

    if (perfilIds.length > 0) {
      modulos_permitidos = await this.obtenerModulosPermitidos(pool, perfilIds);
    }

    // 5) Traer ubicaciones disponibles para el usuario
    const [ubicacionRows]: any = await pool.query(
      `
      SELECT 
        u.id, 
        u.nombre, 
        u.codigo, 
        u.activo
      FROM ubicaciones u
      INNER JOIN usuario_ubicaciones uu ON u.id = uu.ubicacion_id
      WHERE uu.usuario_id = ? 
        AND uu.activo = 1 
        AND u.activo = 1
      ORDER BY u.nombre
      `,
      [user.id]
    );

    const ubicaciones_disponibles: UbicacionDisponible[] = (ubicacionRows || []).map((ub: any) => ({
      id: ub.id,
      nombre: ub.nombre,
      codigo: ub.codigo,
      activo: !!ub.activo
    }));

    // 6) Construir payload
    const payload: AuthPayload = {
      id: user.id,
      email: user.email,
      nombre_usuario: user.nombre_usuario,
      empresa_id: user.empresa_id,
      empresa_nombre: user.empresa_nombre,
      roles,
      perfiles
    };

    // 7) Firmar JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });

    // Log informativo
    console.log(
      `AUTH: login exitoso user_id=${user.id} nombre_usuario=${user.nombre_usuario} ` +
      `roles=${roles.length} perfiles=${perfiles.length} ` +
      `ubicaciones=${ubicaciones_disponibles.length} módulos=${modulos_permitidos.length}`
    );

    // 8) Devolver respuesta
    return {
      token,
      user_id: user.id,
      nombre_usuario: user.nombre_usuario,
      empresa_id: user.empresa_id,
      empresa_nombre: user.empresa_nombre,
      roles,
      perfiles,
      ubicaciones_disponibles,
      modulos_permitidos
    };
  }

  /**
   * ⭐ MÉTODO CORREGIDO: Obtener módulos permitidos para los perfiles del usuario
   * 
   * Lógica:
   * 1. Obtener los IDs de módulos asignados al perfil (de perfil_modulos)
   * 2. Para cada módulo asignado:
   *    - Si es un módulo HIJO (tiene padre_id), incluir automáticamente el padre
   *    - Si es un módulo PADRE, incluirlo directamente
   * 3. Construir la jerarquía solo con los módulos permitidos
   */
  private static async obtenerModulosPermitidos(pool: any, perfilIds: number[]): Promise<ModuloPermitido[]> {
    const placeholders = perfilIds.map(() => '?').join(',');

    // Paso 1: Obtener IDs de módulos asignados al perfil
    const [asignacionesRows]: any = await pool.query(
      `
      SELECT DISTINCT pm.modulo_id
      FROM perfil_modulos pm
      WHERE pm.perfil_id IN (${placeholders})
        AND pm.activo = 1
      `,
      perfilIds
    );

    const modulosAsignadosIds: number[] = (asignacionesRows || []).map((r: any) => r.modulo_id);

    if (modulosAsignadosIds.length === 0) {
      return [];
    }

    // Paso 2: Obtener información completa de los módulos asignados
    const modulosPlaceholders = modulosAsignadosIds.map(() => '?').join(',');
    const [modulosRows]: any = await pool.query(
      `
      SELECT 
        m.id,
        m.codigo,
        m.nombre,
        m.icono,
        m.ruta,
        m.padre_id,
        m.orden
      FROM modulos_frontend m
      WHERE m.id IN (${modulosPlaceholders})
        AND m.activo = 1
      ORDER BY m.orden
      `,
      modulosAsignadosIds
    );

    // Paso 3: Identificar los padres necesarios
    const padresNecesariosIds = new Set<number>();
    const hijosAsignados: any[] = [];
    const padresAsignados: any[] = [];

    (modulosRows || []).forEach((mod: any) => {
      if (mod.padre_id) {
        // Es un módulo hijo
        hijosAsignados.push(mod);
        padresNecesariosIds.add(mod.padre_id);
      } else {
        // Es un módulo padre
        padresAsignados.push(mod);
      }
    });

    // Paso 4: Obtener información de los padres que no están asignados directamente
    const padresAsignadosIds = new Set(padresAsignados.map((p: any) => p.id));
    const padresFaltantesIds = Array.from(padresNecesariosIds).filter(id => !padresAsignadosIds.has(id));

    let padresFaltantes: any[] = [];
    if (padresFaltantesIds.length > 0) {
      const padresFaltantesPlaceholders = padresFaltantesIds.map(() => '?').join(',');
      const [padresFaltantesRows]: any = await pool.query(
        `
        SELECT 
          m.id,
          m.codigo,
          m.nombre,
          m.icono,
          m.ruta,
          m.padre_id,
          m.orden
        FROM modulos_frontend m
        WHERE m.id IN (${padresFaltantesPlaceholders})
          AND m.activo = 1
        `,
        padresFaltantesIds
      );
      padresFaltantes = padresFaltantesRows || [];
    }

    // Paso 5: Combinar todos los padres (asignados + necesarios)
    const todosPadres = [...padresAsignados, ...padresFaltantes];

    // Paso 6: Construir la estructura jerárquica
    const modulosPermitidos: ModuloPermitido[] = todosPadres.map((padre: any) => {
      // Filtrar solo los hijos que están asignados a este padre
      const hijosDeEstePadre = hijosAsignados
        .filter((hijo: any) => hijo.padre_id === padre.id)
        .map((hijo: any) => ({
          id: hijo.id,
          codigo: hijo.codigo,
          nombre: hijo.nombre,
          icono: hijo.icono || undefined,
          ruta: hijo.ruta || undefined,
          orden: hijo.orden || 0
        }))
        .sort((a, b) => a.orden - b.orden);

      return {
        id: padre.id,
        codigo: padre.codigo,
        nombre: padre.nombre,
        icono: padre.icono || undefined,
        ruta: padre.ruta || undefined,
        orden: padre.orden || 0,
        hijos: hijosDeEstePadre
      };
    });

    // Paso 7: Filtrar padres que no tienen hijos (si el padre no fue asignado directamente)
    // Solo mantener padres que:
    // - Tienen hijos asignados, O
    // - Fueron asignados directamente en perfil_modulos
    const modulosFiltrados = modulosPermitidos.filter((modulo) => {
      const fueAsignadoDirectamente = padresAsignadosIds.has(modulo.id);
      const tieneHijos = modulo.hijos.length > 0;
      return fueAsignadoDirectamente || tieneHijos;
    });

    // Ordenar por orden
    return modulosFiltrados.sort((a, b) => a.orden - b.orden);
  }
}