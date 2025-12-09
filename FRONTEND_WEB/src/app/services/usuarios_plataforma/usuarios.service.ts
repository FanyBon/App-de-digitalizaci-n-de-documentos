// src/app/services/usuarios_plataforma/usuarios.service.ts
// CORRECCIÓN: Devolver array directo para compatibilidad
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Usuario {
  id: number;
  email: string;
  nombre_usuario: string;
  empresa_id: number;
  ubicacion_id?: number | null;
  activo: boolean;
  sincronizado: boolean;
  created_at?: Date;
  updated_at?: Date;
  empresa_nombre?: string;
  ubicacion_nombre?: string;
  roles?: Array<{ id: number; nombre: string }>;
  perfiles?: Array<{ id: number; nombre: string }>;
  total_sesiones_creadas?: number;
}

export interface UsuariosResponse {
  total: number;
  data: Usuario[];
}

export interface FiltrosUsuarios {
  empresa_id?: number;
  ubicacion_id?: number;
  activo?: boolean;
  rol_id?: number;
  perfil_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = 'http://localhost:3000/api/usuarios';

  constructor(private http: HttpClient) {}

  /**
   * Obtener headers con token
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('tokencontrolcomidas') || ''}`
    });
  }

  /**
   * Listar usuarios con filtros opcionales
   * IMPORTANTE: Devuelve solo el array de usuarios, no el objeto completo
   */
  listarUsuarios(filtros?: FiltrosUsuarios): Observable<Usuario[]> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.empresa_id) {
        params = params.set('empresa_id', filtros.empresa_id.toString());
      }
      if (filtros.ubicacion_id) {
        params = params.set('ubicacion_id', filtros.ubicacion_id.toString());
      }
      if (filtros.activo !== undefined) {
        params = params.set('activo', filtros.activo.toString());
      }
      if (filtros.rol_id) {
        params = params.set('rol_id', filtros.rol_id.toString());
      }
      if (filtros.perfil_id) {
        params = params.set('perfil_id', filtros.perfil_id.toString());
      }
    }

    return this.http.get<UsuariosResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data) // Extraer solo el array de usuarios
    );
  }

  /**
   * Listar usuarios con información completa (incluye total)
   */
  listarUsuariosCompleto(filtros?: FiltrosUsuarios): Observable<UsuariosResponse> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.empresa_id) {
        params = params.set('empresa_id', filtros.empresa_id.toString());
      }
      if (filtros.ubicacion_id) {
        params = params.set('ubicacion_id', filtros.ubicacion_id.toString());
      }
      if (filtros.activo !== undefined) {
        params = params.set('activo', filtros.activo.toString());
      }
      if (filtros.rol_id) {
        params = params.set('rol_id', filtros.rol_id.toString());
      }
      if (filtros.perfil_id) {
        params = params.set('perfil_id', filtros.perfil_id.toString());
      }
    }

    return this.http.get<UsuariosResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Obtener usuario por ID
   */
  obtenerUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Crear nuevo usuario
   */
  crearUsuario(usuario: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, usuario, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar usuario completo (con roles y perfiles)
   */
  actualizarUsuarioCompleto(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar usuario parcial (sin roles ni perfiles)
   */
  actualizarUsuarioParcial(id: number, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  /**
   * Cambiar estatus (activar/inactivar)
   */
  cambiarEstatus(id: number, activo: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { activo }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Eliminar usuario
   */
  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener historial de auditoría
   */
  obtenerHistorial(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/historial`, {
      headers: this.getHeaders()
    });
  }
}