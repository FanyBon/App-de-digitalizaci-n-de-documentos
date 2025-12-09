import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Ubicacion {
  id?: number;
  empresa_id: number;
  nombre: string;
  codigo: string;
  direccion?: string;
  telefono?: string;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
  empresa_nombre?: string;
  // Stats adicionales
  stats?: {
    puntos_venta_activos: number;
    puntos_venta_total: number;
    usuarios_asignados: number;
  };
}

export interface UbicacionesResponse {
  total: number;
  data: Ubicacion[];
}

@Injectable({
  providedIn: 'root'
})
export class UbicacionesService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Obtener headers con token
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtener todas las ubicaciones
   */
  getUbicaciones(empresaId?: number): Observable<UbicacionesResponse> {
    const url = empresaId 
      ? `${this.apiUrl}/ubicaciones?empresa_id=${empresaId}`
      : `${this.apiUrl}/ubicaciones`;
    
    console.log('📤 GET Ubicaciones:', url);
    
    return this.http.get<UbicacionesResponse>(url, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Obtener una ubicación por ID
   */
  getUbicacionById(id: number): Observable<Ubicacion> {
    console.log('📤 GET Ubicación:', id);
    
    return this.http.get<Ubicacion>(`${this.apiUrl}/ubicaciones/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Crear nueva ubicación
   */
  createUbicacion(ubicacion: Partial<Ubicacion>): Observable<any> {
    console.log('📤 POST Crear ubicación:', ubicacion);
    
    return this.http.post(`${this.apiUrl}/ubicaciones`, ubicacion, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar ubicación
   */
  updateUbicacion(id: number, ubicacion: Partial<Ubicacion>): Observable<any> {
    console.log('📤 PUT Actualizar ubicación:', id, ubicacion);
    
    return this.http.put(`${this.apiUrl}/ubicaciones/${id}`, ubicacion, {
      headers: this.getHeaders()
    });
  }

  /**
   * Desactivar ubicación (soft delete)
   */
  desactivarUbicacion(id: number): Observable<any> {
    console.log('📤 DELETE Desactivar ubicación:', id);
    
    return this.http.delete(`${this.apiUrl}/ubicaciones/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Reactivar ubicación
   */
  reactivarUbicacion(id: number): Observable<any> {
    console.log('📤 PATCH Reactivar ubicación:', id);
    
    return this.http.patch(`${this.apiUrl}/ubicaciones/${id}/reactivate`, {}, {
      headers: this.getHeaders()
    });
  }

  /**
   * Eliminar permanentemente
   */
  eliminarPermanente(id: number): Observable<any> {
    console.log('📤 DELETE PERMANENTE ubicación:', id);
    
    return this.http.delete(`${this.apiUrl}/ubicaciones/${id}/permanent`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener historial de auditoría
   */
  getHistorial(id: number): Observable<any> {
    console.log('📤 GET Historial ubicación:', id);
    
    return this.http.get(`${this.apiUrl}/ubicaciones/${id}/historial`, {
      headers: this.getHeaders()
    });
  }
}