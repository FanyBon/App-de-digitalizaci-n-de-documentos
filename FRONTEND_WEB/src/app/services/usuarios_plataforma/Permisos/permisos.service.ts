// src/app/services/usuarios_plataforma/Permisos/permisos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES
// ============================================

/** Datos de un permiso */
export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
  accion: string;
  metodo?: string;
  ruta?: string;
  es_sistema?: boolean;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

/** Payload para crear un permiso */
export interface CrearPermisoPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
  accion: string;
  metodo?: string;
  ruta?: string;
}

/** Payload para actualizar un permiso */
export interface ActualizarPermisoPayload {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  accion?: string;
  metodo?: string;
  ruta?: string;
}

/** Filtros para listar permisos */
export interface FiltrosPermisos {
  modulo?: string;
  activo?: boolean;
  es_sistema?: boolean;
}

/** Respuesta de listado de permisos */
export interface ListaPermisosResponse {
  total: number;
  filtros_aplicados: FiltrosPermisos;
  data: Permiso[];
}

/** Respuesta de listado de módulos únicos */
export interface ListaModulosResponse {
  total: number;
  data: string[];
}

/** Respuesta de operación exitosa */
export interface PermisoOperacionResponse {
  mensaje: string;
  data: Permiso;
}

/** Respuesta de eliminación */
export interface PermisoDeleteResponse {
  mensaje: string;
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
export interface HistorialPermisoResponse {
  permiso_id: number;
  total_registros: number;
  historial: RegistroAuditoria[];
}

// ============================================
// SERVICIO
// ============================================

@Injectable({
  providedIn: 'root'
})
export class PermisosService {
  private apiUrl = 'http://localhost:3000/api/permisos';

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
   * Listar todos los permisos con filtros opcionales
   * GET /api/permisos?modulo=usuarios&activo=true&es_sistema=false
   */
  listarPermisos(filtros?: FiltrosPermisos): Observable<ListaPermisosResponse> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.modulo) {
        params = params.set('modulo', filtros.modulo);
      }
      if (filtros.activo !== undefined) {
        params = params.set('activo', filtros.activo.toString());
      }
      if (filtros.es_sistema !== undefined) {
        params = params.set('es_sistema', filtros.es_sistema.toString());
      }
    }

    return this.http.get<ListaPermisosResponse>(
      this.apiUrl,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Obtener lista de módulos únicos (para filtros/selects)
   * GET /api/permisos/modulos
   */
  listarModulosUnicos(): Observable<ListaModulosResponse> {
    return this.http.get<ListaModulosResponse>(
      `${this.apiUrl}/modulos`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener permiso por ID
   * GET /api/permisos/:id
   */
  obtenerPermiso(id: number): Observable<Permiso> {
    return this.http.get<Permiso>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de auditoría de un permiso
   * GET /api/permisos/:id/historial
   */
  obtenerHistorial(id: number): Observable<HistorialPermisoResponse> {
    return this.http.get<HistorialPermisoResponse>(
      `${this.apiUrl}/${id}/historial`,
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS DE ESCRITURA (POST, PUT, PATCH, DELETE)
  // ============================================

  /**
   * Crear nuevo permiso
   * POST /api/permisos
   */
  crearPermiso(payload: CrearPermisoPayload): Observable<PermisoOperacionResponse> {
    return this.http.post<PermisoOperacionResponse>(
      this.apiUrl,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Actualizar permiso existente
   * PUT /api/permisos/:id
   */
  actualizarPermiso(id: number, payload: ActualizarPermisoPayload): Observable<PermisoOperacionResponse> {
    return this.http.put<PermisoOperacionResponse>(
      `${this.apiUrl}/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Cambiar estado del permiso (activar/desactivar)
   * PATCH /api/permisos/:id/status
   */
  cambiarEstatus(id: number, activo: boolean): Observable<PermisoOperacionResponse> {
    return this.http.patch<PermisoOperacionResponse>(
      `${this.apiUrl}/${id}/status`,
      { activo },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Eliminar permiso físicamente
   * DELETE /api/permisos/:id
   * Nota: Solo funciona con permisos personalizados (no del sistema)
   */
  eliminarPermiso(id: number): Observable<PermisoDeleteResponse> {
    return this.http.delete<PermisoDeleteResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Activar un permiso (wrapper de cambiarEstatus)
   */
  activarPermiso(id: number): Observable<PermisoOperacionResponse> {
    return this.cambiarEstatus(id, true);
  }

  /**
   * Desactivar un permiso (wrapper de cambiarEstatus)
   */
  desactivarPermiso(id: number): Observable<PermisoOperacionResponse> {
    return this.cambiarEstatus(id, false);
  }

  /**
   * Listar solo permisos activos
   */
  listarPermisosActivos(): Observable<ListaPermisosResponse> {
    return this.listarPermisos({ activo: true });
  }

  /**
   * Listar permisos por módulo
   */
  listarPermisosPorModulo(modulo: string): Observable<ListaPermisosResponse> {
    return this.listarPermisos({ modulo, activo: true });
  }

  /**
   * Listar solo permisos del sistema
   */
  listarPermisosSistema(): Observable<ListaPermisosResponse> {
    return this.listarPermisos({ es_sistema: true });
  }

  /**
   * Listar solo permisos personalizados (no del sistema)
   */
  listarPermisosPersonalizados(): Observable<ListaPermisosResponse> {
    return this.listarPermisos({ es_sistema: false });
  }
}