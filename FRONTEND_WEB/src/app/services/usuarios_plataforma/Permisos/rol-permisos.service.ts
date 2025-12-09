// src/app/services/usuarios_plataforma/Permisos/rol-permisos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES
// ============================================

/** Datos básicos de asignación rol-permiso */
export interface RolPermiso {
  rol_id: number;
  permiso_id: number;
  activo?: boolean;
  assigned_at?: Date;
  assigned_by?: number;
  assigned_ip?: string;
  removed_at?: Date | null;
  removed_by?: number | null;
  removed_ip?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

/** Asignación rol-permiso con información detallada */
export interface RolPermisoDetallado extends RolPermiso {
  rol_nombre?: string;
  permiso_codigo?: string;
  permiso_nombre?: string;
  permiso_modulo?: string;
  permiso_accion?: string;
  assigned_by_nombre?: string;
  removed_by_nombre?: string;
}

/** Respuesta de listado de permisos de un rol */
export interface PermisosDeRolResponse {
  rol_id: number;
  total: number;
  data: RolPermisoDetallado[];
}

/** Respuesta de listado de roles con un permiso */
export interface RolesConPermisoResponse {
  permiso_id: number;
  total: number;
  data: RolPermisoDetallado[];
}

/** Respuesta de asignación */
export interface AsignarPermisoResponse {
  mensaje: string;
  rol_id: number;
  permiso_id: number;
  permisos_actuales: RolPermisoDetallado[];
}

/** Respuesta de remoción */
export interface RemoverPermisoResponse {
  mensaje: string;
  rol_id: number;
  permiso_id: number;
  permisos_actuales: RolPermisoDetallado[];
}

/** Respuesta de sincronización */
export interface SincronizarPermisosResponse {
  mensaje: string;
  rol_id: number;
  total_permisos: number;
  data: RolPermisoDetallado[];
}

/** Registro de auditoría */
export interface RegistroAuditoria {
  id: number;
  tabla: string;
  registro_id: number;
  accion: string;
  usuario_id: number;
  usuario_nombre: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/** Respuesta de historial */
export interface HistorialRolPermisosResponse {
  rol_id: number;
  total_registros: number;
  historial: RegistroAuditoria[];
}

// ============================================
// SERVICIO
// ============================================

@Injectable({
  providedIn: 'root'
})
export class RolPermisosService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /** Obtener token del localStorage */
  private getToken(): string {
    return localStorage.getItem('tokencontrolcomidas') || '';
  }

  /** Generar headers con autorización */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
  }

  // ============================================
  // MÉTODOS DE LECTURA (GET)
  // ============================================

  /**
   * Listar permisos activos de un rol
   * GET /api/roles/:rol_id/permisos
   */
  listarPermisosDeRol(rolId: number): Observable<PermisosDeRolResponse> {
    return this.http.get<PermisosDeRolResponse>(
      `${this.apiUrl}/roles/${rolId}/permisos`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar roles activos que tienen un permiso específico
   * GET /api/permisos/:permiso_id/roles
   */
  listarRolesConPermiso(permisoId: number): Observable<RolesConPermisoResponse> {
    return this.http.get<RolesConPermisoResponse>(
      `${this.apiUrl}/permisos/${permisoId}/roles`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de auditoría de asignaciones de un rol
   * GET /api/roles/:rol_id/permisos/historial
   */
  obtenerHistorial(rolId: number): Observable<HistorialRolPermisosResponse> {
    return this.http.get<HistorialRolPermisosResponse>(
      `${this.apiUrl}/roles/${rolId}/permisos/historial`,
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS DE ESCRITURA (POST, PUT, DELETE)
  // ============================================

  /**
   * Asignar permiso a rol (o reactivar si existe inactivo)
   * POST /api/roles/:rol_id/permisos
   * Body: { "permiso_id": 5 }
   */
  asignarPermiso(rolId: number, permisoId: number): Observable<AsignarPermisoResponse> {
    return this.http.post<AsignarPermisoResponse>(
      `${this.apiUrl}/roles/${rolId}/permisos`,
      { permiso_id: permisoId },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Remover permiso de rol (soft delete)
   * DELETE /api/roles/:rol_id/permisos/:permiso_id
   */
  removerPermiso(rolId: number, permisoId: number): Observable<RemoverPermisoResponse> {
    return this.http.delete<RemoverPermisoResponse>(
      `${this.apiUrl}/roles/${rolId}/permisos/${permisoId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Sincronizar permisos de un rol (reemplazar todos)
   * PUT /api/roles/:rol_id/permisos/sync
   * Body: { "permiso_ids": [1, 2, 3, 5, 8] }
   */
  sincronizarPermisos(rolId: number, permisoIds: number[]): Observable<SincronizarPermisosResponse> {
    return this.http.put<SincronizarPermisosResponse>(
      `${this.apiUrl}/roles/${rolId}/permisos/sync`,
      { permiso_ids: permisoIds },
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Asignar múltiples permisos a un rol (uno por uno)
   * Útil cuando no quieres reemplazar todos los permisos
   */
  asignarMultiplesPermisos(rolId: number, permisoIds: number[]): Observable<AsignarPermisoResponse>[] {
    return permisoIds.map(permisoId => this.asignarPermiso(rolId, permisoId));
  }

  /**
   * Remover múltiples permisos de un rol (uno por uno)
   */
  removerMultiplesPermisos(rolId: number, permisoIds: number[]): Observable<RemoverPermisoResponse>[] {
    return permisoIds.map(permisoId => this.removerPermiso(rolId, permisoId));
  }

  /**
   * Verificar si un rol tiene un permiso específico
   * Nota: Esto hace una petición al servidor, considera cachear si es necesario
   */
  async tienePermiso(rolId: number, permisoId: number): Promise<boolean> {
    try {
      const response = await this.listarPermisosDeRol(rolId).toPromise();
      return response?.data.some(p => p.permiso_id === permisoId) || false;
    } catch {
      return false;
    }
  }
}