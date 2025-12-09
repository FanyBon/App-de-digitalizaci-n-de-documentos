// src/app/services/usuarios_plataforma/Permisos/perfil-modulos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES
// ============================================

/** Datos básicos de asignación perfil-módulo */
export interface PerfilModulo {
  perfil_id: number;
  modulo_id: number;
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

/** Asignación perfil-módulo con información detallada */
export interface PerfilModuloDetallado extends PerfilModulo {
  perfil_nombre?: string;
  modulo_codigo?: string;
  modulo_nombre?: string;
  modulo_ruta?: string;
  modulo_icono?: string;
  modulo_padre_id?: number | null;
  assigned_by_nombre?: string;
  removed_by_nombre?: string;
}

/** Respuesta de listado de módulos de un perfil */
export interface ModulosDePerfilResponse {
  perfil_id: number;
  total: number;
  data: PerfilModuloDetallado[];
}

/** Respuesta de listado de perfiles con un módulo */
export interface PerfilesConModuloResponse {
  modulo_id: number;
  total: number;
  data: PerfilModuloDetallado[];
}

/** Respuesta de asignación */
export interface AsignarModuloResponse {
  mensaje: string;
  perfil_id: number;
  modulo_id: number;
  modulos_actuales: PerfilModuloDetallado[];
}

/** Respuesta de remoción */
export interface RemoverModuloResponse {
  mensaje: string;
  perfil_id: number;
  modulo_id: number;
  modulos_actuales: PerfilModuloDetallado[];
}

/** Respuesta de sincronización */
export interface SincronizarModulosResponse {
  mensaje: string;
  perfil_id: number;
  total_modulos: number;
  data: PerfilModuloDetallado[];
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
export interface HistorialPerfilModulosResponse {
  perfil_id: number;
  total_registros: number;
  historial: RegistroAuditoria[];
}

// ============================================
// SERVICIO
// ============================================

@Injectable({
  providedIn: 'root'
})
export class PerfilModulosService {
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
   * Listar módulos activos de un perfil
   * GET /api/perfiles/:perfil_id/modulos
   */
  listarModulosDePerfil(perfilId: number): Observable<ModulosDePerfilResponse> {
    return this.http.get<ModulosDePerfilResponse>(
      `${this.apiUrl}/perfiles/${perfilId}/modulos`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar perfiles activos que tienen un módulo específico
   * GET /api/modulos-frontend/:modulo_id/perfiles
   */
  listarPerfilesConModulo(moduloId: number): Observable<PerfilesConModuloResponse> {
    return this.http.get<PerfilesConModuloResponse>(
      `${this.apiUrl}/modulos-frontend/${moduloId}/perfiles`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de auditoría de asignaciones de un perfil
   * GET /api/perfiles/:perfil_id/modulos/historial
   */
  obtenerHistorial(perfilId: number): Observable<HistorialPerfilModulosResponse> {
    return this.http.get<HistorialPerfilModulosResponse>(
      `${this.apiUrl}/perfiles/${perfilId}/modulos/historial`,
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS DE ESCRITURA (POST, PUT, DELETE)
  // ============================================

  /**
   * Asignar módulo a perfil (o reactivar si existe inactivo)
   * POST /api/perfiles/:perfil_id/modulos
   * Body: { "modulo_id": 3 }
   */
  asignarModulo(perfilId: number, moduloId: number): Observable<AsignarModuloResponse> {
    return this.http.post<AsignarModuloResponse>(
      `${this.apiUrl}/perfiles/${perfilId}/modulos`,
      { modulo_id: moduloId },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Remover módulo de perfil (soft delete)
   * DELETE /api/perfiles/:perfil_id/modulos/:modulo_id
   */
  removerModulo(perfilId: number, moduloId: number): Observable<RemoverModuloResponse> {
    return this.http.delete<RemoverModuloResponse>(
      `${this.apiUrl}/perfiles/${perfilId}/modulos/${moduloId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Sincronizar módulos de un perfil (reemplazar todos)
   * PUT /api/perfiles/:perfil_id/modulos/sync
   * Body: { "modulo_ids": [1, 2, 3, 5, 8] }
   */
  sincronizarModulos(perfilId: number, moduloIds: number[]): Observable<SincronizarModulosResponse> {
    return this.http.put<SincronizarModulosResponse>(
      `${this.apiUrl}/perfiles/${perfilId}/modulos/sync`,
      { modulo_ids: moduloIds },
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Asignar múltiples módulos a un perfil (uno por uno)
   * Útil cuando no quieres reemplazar todos los módulos
   */
  asignarMultiplesModulos(perfilId: number, moduloIds: number[]): Observable<AsignarModuloResponse>[] {
    return moduloIds.map(moduloId => this.asignarModulo(perfilId, moduloId));
  }

  /**
   * Remover múltiples módulos de un perfil (uno por uno)
   */
  removerMultiplesModulos(perfilId: number, moduloIds: number[]): Observable<RemoverModuloResponse>[] {
    return moduloIds.map(moduloId => this.removerModulo(perfilId, moduloId));
  }

  /**
   * Verificar si un perfil tiene acceso a un módulo específico
   * Nota: Esto hace una petición al servidor, considera cachear si es necesario
   */
  async tieneModulo(perfilId: number, moduloId: number): Promise<boolean> {
    try {
      const response = await this.listarModulosDePerfil(perfilId).toPromise();
      return response?.data.some(m => m.modulo_id === moduloId) || false;
    } catch {
      return false;
    }
  }

  /**
   * Verificar si un perfil tiene acceso a un módulo por código
   */
  async tieneModuloPorCodigo(perfilId: number, moduloCodigo: string): Promise<boolean> {
    try {
      const response = await this.listarModulosDePerfil(perfilId).toPromise();
      return response?.data.some(m => m.modulo_codigo === moduloCodigo) || false;
    } catch {
      return false;
    }
  }
}