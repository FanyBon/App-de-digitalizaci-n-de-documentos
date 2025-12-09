// src/app/services/usuario-ubicaciones/usuario-ubicaciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ====================================
// INTERFACES
// ====================================

export interface UsuarioUbicacion {
  id?: number;
  usuario_id: number;
  ubicacion_id: number;
  asignado_por?: number;
  fecha_asignacion?: Date | string;
  activo?: boolean;
  usuario_nombre?: string;
  usuario_email?: string;
  ubicacion_nombre?: string;
  ubicacion_codigo?: string;
  asignado_por_nombre?: string;
}

export interface UsuarioUbicacionResponse {
  total?: number;
  data?: UsuarioUbicacion[];
  usuario_id?: number;
  ubicacion_id?: number;
  ubicaciones?: UsuarioUbicacion[];
  usuarios?: UsuarioUbicacion[];
}

export interface HistorialEntry {
  id: number;
  accion: string;
  usuario_id: number;
  usuario_nombre: string;
  datos_anteriores: any;
  datos_nuevos: any;
  ip_address: string;
  user_agent: string;
  fecha: string;
}

export interface HistorialResponse {
  asignacion_id: number;
  total_registros: number;
  historial: HistorialEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioUbicacionesService {

  private apiUrl = 'http://localhost:3000/api/usuario-ubicaciones';

  constructor(private http: HttpClient) {}

  // ====================================
  // HEADERS CON TOKEN
  // ====================================

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ====================================
  // CONSULTAS
  // ====================================

  /**
   * Listar todas las asignaciones usuario-ubicación
   */
  listarAsignaciones(): Observable<UsuarioUbicacionResponse> {
    return this.http.get<UsuarioUbicacionResponse>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar ubicaciones de un usuario específico
   */
  listarUbicacionesPorUsuario(usuarioId: number): Observable<UsuarioUbicacionResponse> {
    return this.http.get<UsuarioUbicacionResponse>(
      `${this.apiUrl}/usuario/${usuarioId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Listar usuarios asignados a una ubicación
   */
  listarUsuariosPorUbicacion(ubicacionId: number): Observable<UsuarioUbicacionResponse> {
    return this.http.get<UsuarioUbicacionResponse>(
      `${this.apiUrl}/ubicacion/${ubicacionId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener una asignación por ID
   */
  obtenerAsignacion(id: number): Observable<UsuarioUbicacion> {
    return this.http.get<UsuarioUbicacion>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de una asignación
   */
  obtenerHistorial(id: number): Observable<HistorialResponse> {
    return this.http.get<HistorialResponse>(
      `${this.apiUrl}/${id}/historial`,
      { headers: this.getHeaders() }
    );
  }

  // ====================================
  // MODIFICACIÓN
  // ====================================

  /**
   * Crear nueva asignación usuario-ubicación
   */
  crearAsignacion(data: Partial<UsuarioUbicacion>): Observable<any> {
    return this.http.post(
      this.apiUrl,
      data,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Actualizar una asignación (cambiar estado)
   */
  actualizarAsignacion(id: number, data: Partial<UsuarioUbicacion>): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Activar una asignación desactivada
   */
  activarAsignacion(id: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${id}/activate`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // ====================================
  // ELIMINACIÓN
  // ====================================

  /**
   * Desactivar asignación (soft delete)
   */
  desactivarAsignacion(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Eliminar permanentemente una asignación
   */
  eliminarAsignacionPermanente(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}/permanent`,
      { headers: this.getHeaders() }
    );
  }
}