// src/app/services/sistemas/control_comidas/auth-control-comidas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

// La respuesta que devuelve el login
interface LoginResponse {
  token: string;
  user_id: number;
  nombre_usuario: string;
  role: string;
  empresa_id: number;
  empresa_nombre: string;
  roles: string[];
  perfiles: string[];
}

const TOKEN_KEY = 'tokencontrolcomidas';

export interface UserContext {
  userId: number | null;
  username: string | null;
  // campo “principal” (si lo sigues usando)
  role: string | null;
  // array de roles
  roles: string[];
  // array de perfiles
  perfiles: string[];
  // campo “principal” empresa
  empresaId: number | null;
  empresaNombre: string | null;
  // en el futuro podrías manejar un array empresas: number[]
  empresas: number[];
}

@Injectable({ providedIn: 'root' })
export class AuthControlComidasService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  loginControl(emailOrUsername: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { emailOrUsername, password })
      .pipe(
        tap(resp => {
          localStorage.setItem(TOKEN_KEY, resp.token);
          localStorage.setItem('username', resp.nombre_usuario);
          localStorage.setItem('user_id',    resp.user_id.toString());
          localStorage.setItem('role',       resp.role);
          localStorage.setItem('empresa_id', resp.empresa_id.toString());
          localStorage.setItem('empresa_nombre', resp.empresa_nombre);
          localStorage.setItem('roles',      JSON.stringify(resp.roles));
          localStorage.setItem('perfiles',   JSON.stringify(resp.perfiles));
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

  getRole(): string | null {
    return localStorage.getItem('role');
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

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Este es el nuevo método que consolida todo
  getUser(): UserContext {
    const role         = this.getRole();
    const empresaId    = this.getEmpresaId();
    const rolesArray   = this.getRoles();
    const perfilesArray= this.getPerfiles();

    return {
      userId:          this.getUserId(),
      username:        this.getUserName(),
      role:            role,
      roles:           rolesArray,
      perfiles:        perfilesArray,
      empresaId:       empresaId,
      empresaNombre:   this.getEmpresaName(),
      empresas:        empresaId != null ? [empresaId] : []
    };
  }
}
