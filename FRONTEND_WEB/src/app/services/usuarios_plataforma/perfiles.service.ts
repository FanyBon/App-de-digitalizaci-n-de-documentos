import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Perfil {
  id: number;
  nombre: string;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilesService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  listarPerfiles(): Observable<Perfil[]> {
    return this.http.get<Perfil[]>(`${this.apiUrl}/perfiles`);
  }

  obtenerPerfil(id: number): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.apiUrl}/perfiles/${id}`);
  }

  crearPerfil(payload: { nombre: string; descripcion: string }): Observable<Perfil> {
    return this.http.post<Perfil>(`${this.apiUrl}/perfiles`, payload);
  }

  editarPerfil(id: number, payload: { nombre: string; descripcion: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/perfiles/${id}`, payload);
  }

  eliminarPerfil(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/perfiles/${id}`);
  }
}
