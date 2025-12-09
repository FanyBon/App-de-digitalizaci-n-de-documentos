// src/app/services/sistemas/control_comidas/auth-control-comidas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ModulosUsuarioService, ModuloPermitido } from '../../usuarios_plataforma/modulos-usuario.service';

// Interfaz de ubicación disponible
interface UbicacionDisponible {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}

// La respuesta que devuelve el login
interface LoginResponse {
  token: string;
  user_id: number;
  nombre_usuario: string;
  empresa_id: number;
  empresa_nombre: string;
  roles: string[];
  perfiles: string[];
  ubicaciones_disponibles: UbicacionDisponible[];
  modulos_permitidos: ModuloPermitido[]; // ⭐ NUEVO
}

const TOKEN_KEY = 'tokencontrolcomidas';

export interface UserContext {
  userId: number | null;
  username: string | null;
  roles: string[];
  perfiles: string[];
  empresaId: number | null;
  empresaNombre: string | null;
  ubicaciones: UbicacionDisponible[];
}

@Injectable({ providedIn: 'root' })
export class AuthControlComidasService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private modulosUsuarioService: ModulosUsuarioService // ⭐ NUEVO
  ) {}

  /**
   * Login - Guarda ubicaciones_disponibles y modulos_permitidos en localStorage
   */
  loginControl(emailOrUsername: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { emailOrUsername, password })
      .pipe(
        tap(resp => {
          localStorage.setItem(TOKEN_KEY, resp.token);
          localStorage.setItem('username', resp.nombre_usuario);
          localStorage.setItem('user_id', resp.user_id.toString());
          localStorage.setItem('empresa_id', resp.empresa_id.toString());
          localStorage.setItem('empresa_nombre', resp.empresa_nombre);
          localStorage.setItem('roles', JSON.stringify(resp.roles));
          localStorage.setItem('perfiles', JSON.stringify(resp.perfiles));
          localStorage.setItem('ubicaciones_disponibles', JSON.stringify(resp.ubicaciones_disponibles));

          // ⭐ NUEVO: Guardar módulos permitidos
          if (resp.modulos_permitidos && resp.modulos_permitidos.length > 0) {
            this.modulosUsuarioService.guardarModulos(resp.modulos_permitidos);
          }

          console.log('✅ Login exitoso:', {
            user: resp.nombre_usuario,
            roles: resp.roles,
            perfiles: resp.perfiles,
            ubicaciones: resp.ubicaciones_disponibles.length,
            modulos: resp.modulos_permitidos?.length || 0
          });
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUserName(): string | null {
    return localStorage.getItem('username');
  }

  getUserId(): number | null {
    const v = localStorage.getItem('user_id');
    return v ? +v : null;
  }

  getRoles(): string[] {
    const raw = localStorage.getItem('roles');
    return raw ? JSON.parse(raw) : [];
  }

  getEmpresaId(): number | null {
    const v = localStorage.getItem('empresa_id');
    return v ? +v : null;
  }

  getEmpresaName(): string | null {
    return localStorage.getItem('empresa_nombre');
  }

  getPerfiles(): string[] {
    const raw = localStorage.getItem('perfiles');
    return raw ? JSON.parse(raw) : [];
  }

  getUbicacionesDisponibles(): UbicacionDisponible[] {
    const raw = localStorage.getItem('ubicaciones_disponibles');
    return raw ? JSON.parse(raw) : [];
  }

  // ⭐ NUEVO: Obtener módulos permitidos
  getModulosPermitidos(): ModuloPermitido[] {
    return this.modulosUsuarioService.getModulosPermitidos();
  }

  // ⭐ NUEVO: Verificar acceso a módulo
  tieneAccesoModulo(codigo: string): boolean {
    return this.modulosUsuarioService.tieneAccesoModulo(codigo);
  }

  // ⭐ NUEVO: Verificar acceso a ruta
  tieneAccesoRuta(ruta: string): boolean {
    return this.modulosUsuarioService.tieneAccesoRuta(ruta);
  }

  /**
   * ⭐ Cerrar sesión completa (operativa + JWT)
   */
  logout(): void {
    const sesionId = localStorage.getItem('sesion_id');
    const token = localStorage.getItem(TOKEN_KEY);

    // Cerrar sesión operativa en backend si existe
    if (sesionId && token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      this.http.post(`${this.apiUrl}/sesiones/cerrar`, {}, { headers })
        .subscribe({
          next: () => console.log('✅ Sesión operativa cerrada en backend'),
          error: (err) => console.warn('⚠️ Error al cerrar sesión operativa:', err)
        });
    }

    // ⭐ Limpiar módulos
    this.modulosUsuarioService.limpiarModulos();

    // Limpiar localStorage
    localStorage.clear();

    // Redirigir a login
    this.router.navigate(['/login']);
  }

  /**
   * ⭐ Cerrar solo sesión operativa (mantener login)
   */
  cerrarSesionOperativa(): void {
    const sesionId = localStorage.getItem('sesion_id');
    const token = localStorage.getItem(TOKEN_KEY);

    if (sesionId && token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });

      this.http.post(`${this.apiUrl}/sesiones/cerrar`, {}, { headers })
        .subscribe({
          next: () => {
            console.log('✅ Sesión operativa cerrada');
            
            // Limpiar solo datos de sesión operativa
            localStorage.removeItem('sesion_id');
            localStorage.removeItem('ubicacion_seleccionada');
            localStorage.removeItem('punto_venta_id');
            localStorage.removeItem('punto_venta_nombre');
            localStorage.removeItem('punto_venta_codigo');
            localStorage.removeItem('punto_venta_tipo_codigo');
            localStorage.removeItem('punto_venta_tipo_nombre');
          },
          error: (err) => console.warn('⚠️ Error al cerrar sesión operativa:', err)
        });
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * ⭐ Verificar si hay sesión operativa completa
   */
  hasOperativeSession(): boolean {
    return !!(
      localStorage.getItem('sesion_id') &&
      localStorage.getItem('punto_venta_id') &&
      localStorage.getItem('punto_venta_tipo_codigo')
    );
  }

  /**
   * ⭐ Obtener información de la sesión operativa
   */
  getOperativeSessionInfo(): {
    ubicacionId?: number;
    ubicacionNombre?: string;
    puntoVentaId?: number;
    puntoVentaNombre?: string;
    sesionId?: number;
  } {
    const ubicacionString = localStorage.getItem('ubicacion_seleccionada');
    const ubicacion = ubicacionString ? JSON.parse(ubicacionString) : null;

    return {
      ubicacionId: ubicacion?.id,
      ubicacionNombre: ubicacion?.nombre,
      puntoVentaId: parseInt(localStorage.getItem('punto_venta_id') || '0') || undefined,
      puntoVentaNombre: localStorage.getItem('punto_venta_nombre') || undefined,
      sesionId: parseInt(localStorage.getItem('sesion_id') || '0') || undefined
    };
  }

  /**
   * Método que consolida todo el contexto del usuario
   */
  getUser(): UserContext {
    return {
      userId: this.getUserId(),
      username: this.getUserName(),
      roles: this.getRoles(),
      perfiles: this.getPerfiles(),
      empresaId: this.getEmpresaId(),
      empresaNombre: this.getEmpresaName(),
      ubicaciones: this.getUbicacionesDisponibles()
    };
  }
}