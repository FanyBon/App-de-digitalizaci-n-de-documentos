import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Role {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  listarRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  obtenerRol(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/roles/${id}`);
  }

  crearRol(payload: { nombre: string }): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/roles`, payload);
  }

  editarRol(id: number, payload: { nombre: string }): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/roles/${id}`, payload);
  }

  eliminarRol(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
  }
}
