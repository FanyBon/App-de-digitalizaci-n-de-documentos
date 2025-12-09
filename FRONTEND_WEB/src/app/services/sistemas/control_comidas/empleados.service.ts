// src/app/services/sistemas/control_comidas/empleados.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ====================================
// INTERFACES - Definidas en el servicio
// ====================================

/**
 * Interface principal de Empleado
 */
export interface Empleado {
  id: number;
  nombre: string;
  cedula: string;
  empresa_id: number;
  empresa_nombre?: string;
  codigo_barras: string;
  codigo_qr?: string;
  activo: boolean;
  max_asistencias_por_dia: number;
  aplica_subsidio: boolean;
  id_ubicacion_empleado?: string;
  sincronizado: boolean;
  monedero_id?: number | null;
  nip_hash?: string | null;
  nip_failed_attempts?: number;
  nip_locked_until?: Date | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Interface para crear un nuevo empleado
 * NOTA: empresa_id puede ser number o null para compatibilidad con módulo de clientes
 */
export interface EmpleadoCreate {
  nombre: string;
  cedula: string;
  empresa_id: number | null;  // ← Permitir null
  codigo_barras?: string;
  codigo_qr?: string;
  activo?: boolean;
  max_asistencias_por_dia?: number;
  aplica_subsidio?: boolean;
  id_ubicacion_empleado?: string;
  sincronizado?: boolean;
  monedero_id?: number | null;
}

/**
 * Interface para actualizar un empleado
 * NOTA: empresa_id también puede ser null en actualizaciones
 */
export interface EmpleadoUpdate {
  nombre?: string;
  cedula?: string;
  empresa_id?: number | null;  // ← CRÍTICO: Permitir null también en UPDATE
  codigo_barras?: string;
  codigo_qr?: string;
  activo?: boolean;
  max_asistencias_por_dia?: number;
  aplica_subsidio?: boolean;
  id_ubicacion_empleado?: string;
  sincronizado?: boolean;
  monedero_id?: number | null;
}

/**
 * Interface para respuestas del API
 */
export interface EmpleadoResponse {
  message?: string;
  data?: Empleado;
  total?: number;
  error?: string;
}

/**
 * Interface para respuestas de listado
 */
export interface EmpleadosListResponse {
  total: number;
  data: Empleado[];
}

// ====================================
// SERVICIO
// ====================================

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {
  private apiUrl = 'http://localhost:3000/api/empleados';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los headers con el token de autenticación
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    });
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: any): Observable<never> {
    console.error('❌ Error en EmpleadosService:', error);
    let errorMessage = 'Ha ocurrido un error en el servidor';

    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  // ====================================
  // MÉTODOS CRUD
  // ====================================

  /**
   * Lista todos los empleados (activos por defecto)
   */
  listarEmpleados(incluirInactivos: boolean = false): Observable<Empleado[]> {
    const params = new HttpParams().set(
      'incluir_inactivos',
      incluirInactivos.toString()
    );

    return this.http.get<EmpleadosListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene un empleado por ID
   */
  obtenerEmpleado(id: number): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Busca empleados por término
   */
  buscarEmpleados(query: string, incluirInactivos: boolean = false): Observable<Empleado[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('incluir_inactivos', incluirInactivos.toString());

    return this.http.get<EmpleadosListResponse>(`${this.apiUrl}/search`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo empleado
   */
  crearEmpleado(empleado: EmpleadoCreate): Observable<EmpleadoResponse> {
    return this.http.post<EmpleadoResponse>(this.apiUrl, empleado, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un empleado existente
   */
  editarEmpleado(id: number, empleado: EmpleadoUpdate): Observable<EmpleadoResponse> {
    return this.http.put<EmpleadoResponse>(`${this.apiUrl}/${id}`, empleado, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Desactiva un empleado (soft delete)
   */
  desactivarEmpleado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/desactivar`, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Reactiva un empleado previamente desactivado
   */
  reactivarEmpleado(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/reactivar`, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina permanentemente un empleado
   */
  eliminarEmpleado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Establece o actualiza el NIP de un empleado
   */
  establecerNip(id: number, nip: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/nip`, { nip }, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza el monedero de un empleado
   */
  actualizarMonedero(id: number, monederoId: number | null): Observable<EmpleadoResponse> {
    return this.http.put<EmpleadoResponse>(
      `${this.apiUrl}/${id}/monedero`,
      { monedero_id: monederoId },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
}