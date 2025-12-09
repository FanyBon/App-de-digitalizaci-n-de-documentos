// src/app/services/sesion-operativa/sesion-operativa.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface SesionOperativa {
  sesion_id: number;
  sesion_token: string;
  usuario_id: number;
  usuario_nombre: string;
  empresa_id: number;
  ubicacion_id: number;
  ubicacion_nombre: string;
  punto_venta_id: number;
  punto_venta_nombre: string;
  punto_venta_codigo: string;
  last_activity?: Date;
}

export interface IniciarSesionRequest {
  ubicacion_id: number;
  punto_venta_id: number;
}

export interface SesionLocalData {
  // Datos del login
  userId: number;
  username: string;
  token: string;
  roles: string[];
  perfiles: string[];
  empresaId: number;
  empresaNombre: string;
  
  // Datos de la sesión operativa
  ubicacionId?: number;
  ubicacionNombre?: string;
  puntoVentaId?: number;
  puntoVentaNombre?: string;
  sesionToken?: string;
  sesionId?: number;
  
  // Estado
  sessionCompleta: boolean;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SesionOperativaService {
  private apiUrl = 'http://localhost:3000/api';
  
  private sessionSubject = new BehaviorSubject<SesionLocalData | null>(null);
  public session$ = this.sessionSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadSessionFromStorage();
  }

  /**
   * Cargar sesión desde localStorage al iniciar
   */
  private loadSessionFromStorage() {
    const token = localStorage.getItem('tokencontrolcomidas');
    if (!token) {
      return;
    }

    try {
      const session: SesionLocalData = {
        userId: parseInt(localStorage.getItem('user_id') || '0'),
        username: localStorage.getItem('username') || '',
        token: token,
        roles: JSON.parse(localStorage.getItem('roles') || '[]'),
        perfiles: JSON.parse(localStorage.getItem('perfiles') || '[]'),
        empresaId: parseInt(localStorage.getItem('empresa_id') || '0'),
        empresaNombre: localStorage.getItem('empresa_nombre') || '',
        
        // Sesión operativa
        ubicacionId: this.getStoredNumber('ubicacion_id'),
        ubicacionNombre: localStorage.getItem('ubicacion_nombre') || undefined,
        puntoVentaId: this.getStoredNumber('punto_venta_id'),
        puntoVentaNombre: localStorage.getItem('punto_venta_nombre') || undefined,
        sesionToken: localStorage.getItem('sesion_token') || undefined,
        sesionId: this.getStoredNumber('sesion_id'),
        
        sessionCompleta: this.isSessionComplete(),
        timestamp: localStorage.getItem('session_timestamp') || new Date().toISOString()
      };

      this.sessionSubject.next(session);
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      this.clearSession();
    }
  }

  /**
   * Helper para obtener números de localStorage
   */
  private getStoredNumber(key: string): number | undefined {
    const value = localStorage.getItem(key);
    return value ? parseInt(value) : undefined;
  }

  /**
   * Verificar si la sesión está completa
   */
  private isSessionComplete(): boolean {
    return !!(
      localStorage.getItem('ubicacion_id') && 
      localStorage.getItem('punto_venta_id') &&
      localStorage.getItem('sesion_token')
    );
  }

  /**
   * Inicializar sesión después del login (sin ubicación ni PDV aún)
   */
  initSession(loginData: {
    user_id: number;
    nombre_usuario: string;
    token: string;
    roles: string[];
    perfiles: string[];
    empresa_id: number;
    empresa_nombre: string;
  }) {
    // Guardar datos del login
    localStorage.setItem('tokencontrolcomidas', loginData.token);
    localStorage.setItem('username', loginData.nombre_usuario);
    localStorage.setItem('user_id', loginData.user_id.toString());
    localStorage.setItem('roles', JSON.stringify(loginData.roles));
    localStorage.setItem('perfiles', JSON.stringify(loginData.perfiles));
    localStorage.setItem('empresa_id', loginData.empresa_id.toString());
    localStorage.setItem('empresa_nombre', loginData.empresa_nombre);
    localStorage.setItem('session_timestamp', new Date().toISOString());

    const session: SesionLocalData = {
      userId: loginData.user_id,
      username: loginData.nombre_usuario,
      token: loginData.token,
      roles: loginData.roles,
      perfiles: loginData.perfiles,
      empresaId: loginData.empresa_id,
      empresaNombre: loginData.empresa_nombre,
      sessionCompleta: false,
      timestamp: new Date().toISOString()
    };

    this.sessionSubject.next(session);
  }

  /**
   * Iniciar sesión operativa en el backend
   * Este método llama al endpoint POST /sesiones/iniciar
   */
  iniciarSesionOperativa(
    ubicacionId: number,
    puntoVentaId: number,
    ubicacionNombre: string,
    puntoVentaNombre: string
  ): Observable<SesionOperativa> {
    const token = localStorage.getItem('tokencontrolcomidas');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const body: IniciarSesionRequest = {
      ubicacion_id: ubicacionId,
      punto_venta_id: puntoVentaId
    };

    return this.http.post<SesionOperativa>(
      `${this.apiUrl}/sesiones/iniciar`,
      body,
      { headers }
    ).pipe(
      tap((sesionOperativa) => {
        // Guardar datos de la sesión operativa
        localStorage.setItem('sesion_id', sesionOperativa.sesion_id.toString());
        localStorage.setItem('sesion_token', sesionOperativa.sesion_token);
        localStorage.setItem('ubicacion_id', ubicacionId.toString());
        localStorage.setItem('ubicacion_nombre', ubicacionNombre);
        localStorage.setItem('punto_venta_id', puntoVentaId.toString());
        localStorage.setItem('punto_venta_nombre', puntoVentaNombre);

        // Actualizar el subject
        const currentSession = this.sessionSubject.value;
        if (currentSession) {
          const updatedSession: SesionLocalData = {
            ...currentSession,
            ubicacionId: ubicacionId,
            ubicacionNombre: ubicacionNombre,
            puntoVentaId: puntoVentaId,
            puntoVentaNombre: puntoVentaNombre,
            sesionToken: sesionOperativa.sesion_token,
            sesionId: sesionOperativa.sesion_id,
            sessionCompleta: true
          };
          this.sessionSubject.next(updatedSession);
        }

        console.log('✅ Sesión operativa iniciada:', sesionOperativa);
      })
    );
  }

  /**
   * Cerrar sesión operativa en el backend
   */
  cerrarSesionOperativa(): Observable<{ message: string }> {
    const token = localStorage.getItem('tokencontrolcomidas');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/sesiones/cerrar`,
      {},
      { headers }
    ).pipe(
      tap(() => {
        // Limpiar datos de sesión operativa pero mantener login
        localStorage.removeItem('sesion_id');
        localStorage.removeItem('sesion_token');
        localStorage.removeItem('ubicacion_id');
        localStorage.removeItem('ubicacion_nombre');
        localStorage.removeItem('punto_venta_id');
        localStorage.removeItem('punto_venta_nombre');

        const currentSession = this.sessionSubject.value;
        if (currentSession) {
          this.sessionSubject.next({
            ...currentSession,
            ubicacionId: undefined,
            ubicacionNombre: undefined,
            puntoVentaId: undefined,
            puntoVentaNombre: undefined,
            sesionToken: undefined,
            sesionId: undefined,
            sessionCompleta: false
          });
        }

        console.log('✅ Sesión operativa cerrada');
      })
    );
  }

  /**
   * Obtener mi sesión activa desde el backend
   */
  getMiSesionActiva(): Observable<SesionOperativa | null> {
    const token = localStorage.getItem('tokencontrolcomidas');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<SesionOperativa | null>(
      `${this.apiUrl}/sesiones/mi-sesion`,
      { headers }
    );
  }

  /**
   * Obtener sesión local actual
   */
  getSession(): SesionLocalData | null {
    return this.sessionSubject.value;
  }

  /**
   * Limpiar sesión completamente (logout total)
   */
  clearSession() {
    localStorage.clear();
    this.sessionSubject.next(null);
  }

  /**
   * Cambiar ubicación y PDV (reiniciar sesión operativa)
   */
  cambiarUbicacionYPDV() {
    // Cerrar sesión operativa si existe
    const session = this.getSession();
    if (session?.sesionToken) {
      this.cerrarSesionOperativa().subscribe({
        next: () => {
          this.router.navigate(['/seleccion-ubicacion']);
        },
        error: (err) => {
          console.error('Error al cerrar sesión operativa:', err);
          // Limpiar local de todas formas
          localStorage.removeItem('sesion_id');
          localStorage.removeItem('sesion_token');
          localStorage.removeItem('ubicacion_id');
          localStorage.removeItem('ubicacion_nombre');
          localStorage.removeItem('punto_venta_id');
          localStorage.removeItem('punto_venta_nombre');
          this.router.navigate(['/seleccion-ubicacion']);
        }
      });
    } else {
      this.router.navigate(['/seleccion-ubicacion']);
    }
  }

  /**
   * Obtener información resumida de la sesión
   */
  getSessionInfo(): string {
    const session = this.sessionSubject.value;
    if (!session) return 'Sin sesión';
    
    if (!session.sessionCompleta) {
      return `${session.username} - Configurando...`;
    }
    
    return `${session.ubicacionNombre} - ${session.puntoVentaNombre}`;
  }
}