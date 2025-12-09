// src/app/services/usuarios_plataforma/Permisos/modulos-frontend.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ============================================
// INTERFACES
// ============================================

/** Datos básicos de un módulo frontend */
export interface ModuloFrontend {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  ruta?: string;
  padre_id?: number | null;
  orden?: number;
  es_sistema?: boolean;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

/** Módulo con información adicional (padre, hijos) */
export interface ModuloFrontendDetallado extends ModuloFrontend {
  padre_nombre?: string;
  total_hijos?: number;
}

/** Payload para crear un módulo */
export interface CrearModuloPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  ruta?: string;
  padre_id?: number | null;
  orden?: number;
}

/** Payload para actualizar un módulo */
export interface ActualizarModuloPayload {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  icono?: string;
  ruta?: string;
  padre_id?: number | null;
  orden?: number;
}

/** Filtros para listar módulos */
export interface FiltrosModulos {
  activo?: boolean;
  es_sistema?: boolean;
  padre_id?: number | null;
}

/** Respuesta de listado de módulos */
export interface ListaModulosResponse {
  total: number;
  filtros_aplicados: FiltrosModulos;
  data: ModuloFrontendDetallado[];
}

/** Respuesta de módulos principales */
export interface ModulosPrincipalesResponse {
  total: number;
  data: ModuloFrontendDetallado[];
}

/** Respuesta de submódulos */
export interface SubmodulosResponse {
  padre_id: number;
  total: number;
  data: ModuloFrontendDetallado[];
}

/** Respuesta de operación exitosa */
export interface ModuloOperacionResponse {
  mensaje: string;
  data: ModuloFrontendDetallado;
}

/** Respuesta de eliminación */
export interface ModuloDeleteResponse {
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
export interface HistorialResponse {
  modulo_id: number;
  total_registros: number;
  historial: RegistroAuditoria[];
}

// ============================================
// SERVICIO
// ============================================

@Injectable({
  providedIn: 'root'
})
export class ModulosFrontendService {
  private apiUrl = 'http://localhost:3000/api/modulos-frontend';

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
   * Listar todos los módulos con filtros opcionales
   * GET /api/modulos-frontend?activo=true&es_sistema=false&padre_id=null
   */
  listarModulos(filtros?: FiltrosModulos): Observable<ListaModulosResponse> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.activo !== undefined) {
        params = params.set('activo', filtros.activo.toString());
      }
      if (filtros.es_sistema !== undefined) {
        params = params.set('es_sistema', filtros.es_sistema.toString());
      }
      if (filtros.padre_id !== undefined) {
        params = params.set('padre_id', filtros.padre_id === null ? 'null' : filtros.padre_id.toString());
      }
    }

    return this.http.get<ListaModulosResponse>(
      this.apiUrl,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Listar solo módulos principales (sin padre)
   * GET /api/modulos-frontend/principales
   */
  listarModulosPrincipales(): Observable<ModulosPrincipalesResponse> {
    return this.http.get<ModulosPrincipalesResponse>(
      `${this.apiUrl}/principales`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener módulo por ID
   * GET /api/modulos-frontend/:id
   */
  obtenerModulo(id: number): Observable<ModuloFrontendDetallado> {
    return this.http.get<ModuloFrontendDetallado>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar submódulos de un módulo padre
   * GET /api/modulos-frontend/:id/hijos
   */
  listarSubmodulos(padreId: number): Observable<SubmodulosResponse> {
    return this.http.get<SubmodulosResponse>(
      `${this.apiUrl}/${padreId}/hijos`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de auditoría de un módulo
   * GET /api/modulos-frontend/:id/historial
   */
  obtenerHistorial(id: number): Observable<HistorialResponse> {
    return this.http.get<HistorialResponse>(
      `${this.apiUrl}/${id}/historial`,
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS DE ESCRITURA (POST, PUT, PATCH, DELETE)
  // ============================================

  /**
   * Crear nuevo módulo
   * POST /api/modulos-frontend
   */
  crearModulo(payload: CrearModuloPayload): Observable<ModuloOperacionResponse> {
    return this.http.post<ModuloOperacionResponse>(
      this.apiUrl,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Actualizar módulo existente
   * PUT /api/modulos-frontend/:id
   */
  actualizarModulo(id: number, payload: ActualizarModuloPayload): Observable<ModuloOperacionResponse> {
    return this.http.put<ModuloOperacionResponse>(
      `${this.apiUrl}/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Cambiar estado del módulo (activar/desactivar)
   * PATCH /api/modulos-frontend/:id/status
   */
  cambiarEstatus(id: number, activo: boolean): Observable<ModuloOperacionResponse> {
    return this.http.patch<ModuloOperacionResponse>(
      `${this.apiUrl}/${id}/status`,
      { activo },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Eliminar módulo físicamente
   * DELETE /api/modulos-frontend/:id
   * Nota: Solo funciona con módulos personalizados sin hijos
   */
  eliminarModulo(id: number): Observable<ModuloDeleteResponse> {
    return this.http.delete<ModuloDeleteResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Activar un módulo (wrapper de cambiarEstatus)
   */
  activarModulo(id: number): Observable<ModuloOperacionResponse> {
    return this.cambiarEstatus(id, true);
  }

  /**
   * Desactivar un módulo (wrapper de cambiarEstatus)
   */
  desactivarModulo(id: number): Observable<ModuloOperacionResponse> {
    return this.cambiarEstatus(id, false);
  }

  /**
   * Listar solo módulos activos
   */
  listarModulosActivos(): Observable<ListaModulosResponse> {
    return this.listarModulos({ activo: true });
  }

  /**
   * Listar solo módulos del sistema
   */
  listarModulosSistema(): Observable<ListaModulosResponse> {
    return this.listarModulos({ es_sistema: true });
  }

  /**
   * Listar solo módulos personalizados (no del sistema)
   */
  listarModulosPersonalizados(): Observable<ListaModulosResponse> {
    return this.listarModulos({ es_sistema: false });
  }
}