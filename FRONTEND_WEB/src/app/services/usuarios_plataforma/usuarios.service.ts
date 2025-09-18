import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = 'http://localhost:3000/api/usuarios'; // URL base del backend

  constructor(private http: HttpClient) {}

  // Método para obtener el token desde el localStorage
  private getToken(): string {
    return localStorage.getItem('tokencontrolcomidas') || ''; // Recuperar el token
  }

  // Método para generar las cabeceras con el token
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
    Authorization: `Bearer ${localStorage.getItem('tokencontrolcomidas') || ''}`
    });
  }

  // Método para listar todos los usuarios
  listarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  // Método para crear un nuevo usuario
  crearUsuario(usuario: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, usuario, { headers: this.getHeaders() });
  }

  // Alias para edición completa (incluye sincronización de roles y perfiles)
  actualizarUsuarioCompleto(id: number, payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // Edición parcial (solo algunos campos)
  actualizarUsuarioParcial(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // Método para eliminar un usuario por ID
  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
