// src/app/services/recargas/subsidios.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Subsidio {
  id: number;
  nombre: string;
  porcentaje: number;
  descripcion?: string;
  empresa_id: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubsidiosService {
  private apiUrl = 'http://localhost:3000/api/subsidios';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  /** GET  /subsidios → Lista todos los subsidios */
  listarSubsidios(): Observable<Subsidio[]> {
    return this.http.get<Subsidio[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  /** GET  /subsidios/:id → Obtiene un subsidio por ID */
  obtenerSubsidio(id: number): Observable<Subsidio> {
    return this.http.get<Subsidio>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  /** POST /subsidios → Crea un subsidio */
  crearSubsidio(data: Partial<Subsidio>): Observable<Subsidio> {
    return this.http.post<Subsidio>(this.apiUrl, data, { headers: this.getHeaders() });
  }

  /** PUT  /subsidios/:id → Edita un subsidio */
  editarSubsidio(id: number, data: Partial<Subsidio>): Observable<Subsidio> {
    return this.http.put<Subsidio>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  /** DELETE /subsidios/:id → Elimina un subsidio */
  eliminarSubsidio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
