// src/app/components/configuracion/permisos/rol-permisos/rol-permisos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { RolPermisosService, RolPermisoDetallado } from '../../../../services/usuarios_plataforma/Permisos/rol-permisos.service';
import { PermisosService, Permiso } from '../../../../services/usuarios_plataforma/Permisos/permisos.service';

// Interfaz para Rol
interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  es_sistema?: boolean;
}

@Component({
  selector: 'app-rol-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rol-permisos.component.html',
  styleUrls: ['./rol-permisos.component.css']
})
export class RolPermisosComponent implements OnInit {
  // ============================================
  // DATOS
  // ============================================
  roles: Rol[] = [];
  rolSeleccionado: number | null = null;
  permisosDelRol: RolPermisoDetallado[] = [];
  todosLosPermisos: Permiso[] = [];

  // ============================================
  // ESTADOS
  // ============================================
  loading: boolean = false;
  loadingRoles: boolean = false;
  loadingPermisos: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // ============================================
  // BÚSQUEDA
  // ============================================
  searchTerm: string = '';

  // ============================================
  // API
  // ============================================
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private rolPermisosService: RolPermisosService,
    private permisosService: PermisosService
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ============================================
  // HEADERS CON TOKEN
  // ============================================
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ============================================
  // CARGAR DATOS INICIALES
  // ============================================
  cargarDatosIniciales() {
    this.loading = true;
    this.error = '';

    // Cargar roles y permisos en paralelo
    Promise.all([
      this.cargarRoles(),
      this.cargarPermisos()
    ]).then(() => {
      this.loading = false;
      this.inicioCargaCompleto = true;
    }).catch((err) => {
      console.error('❌ Error al cargar datos:', err);
      this.error = 'Error al cargar los datos iniciales';
      this.loading = false;
      this.inicioCargaCompleto = true;
    });
  }

  // ============================================
  // CARGAR ROLES DESDE LA BD
  // ============================================
  cargarRoles(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingRoles = true;

      this.http.get<{ success: boolean; data: Rol[] }>(
        `${this.apiUrl}/roles`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (response) => {
          // Filtrar solo roles activos
          this.roles = (response.data || []).filter(r => r.activo);
          this.loadingRoles = false;
          console.log('✅ Roles cargados:', this.roles.length);
          resolve();
        },
        error: (err) => {
          console.error('❌ Error al cargar roles:', err);
          this.loadingRoles = false;
          // Si falla, intentar con endpoint alternativo o mostrar error
          this.error = 'Error al cargar los roles';
          reject(err);
        }
      });
    });
  }

  // ============================================
  // CARGAR PERMISOS
  // ============================================
  cargarPermisos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingPermisos = true;

      this.permisosService.listarPermisos().subscribe({
        next: (response) => {
          // Filtrar solo permisos activos
          this.todosLosPermisos = (response.data || []).filter((p: Permiso) => p.activo);
          this.loadingPermisos = false;
          console.log('✅ Permisos cargados:', this.todosLosPermisos.length);
          resolve();
        },
        error: (err) => {
          console.error('❌ Error al cargar permisos:', err);
          this.loadingPermisos = false;
          reject(err);
        }
      });
    });
  }

  // ============================================
  // SELECCIONAR ROL
  // ============================================
  seleccionarRol(rolId: number) {
    this.rolSeleccionado = rolId;
    this.cargarPermisosDelRol(rolId);
  }

  // ============================================
  // CARGAR PERMISOS DEL ROL SELECCIONADO
  // ============================================
  cargarPermisosDelRol(rolId: number) {
    this.loading = true;
    
    this.rolPermisosService.listarPermisosDeRol(rolId).subscribe({
      next: (response) => {
        this.permisosDelRol = response.data || [];
        this.loading = false;
        console.log(`✅ Permisos del rol ${rolId}:`, this.permisosDelRol.length);
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.error = 'Error al cargar los permisos del rol';
        this.loading = false;
      }
    });
  }

  // ============================================
  // VERIFICAR SI TIENE PERMISO
  // ============================================
  tienePermiso(permisoId: number): boolean {
    return this.permisosDelRol.some(p => p.permiso_id === permisoId && p.activo);
  }

  // ============================================
  // TOGGLE PERMISO (ASIGNAR/REMOVER)
  // ============================================
  togglePermiso(permiso: Permiso) {
    if (!this.rolSeleccionado) return;

    const tienePermiso = this.tienePermiso(permiso.id!);

    if (tienePermiso) {
      // Remover permiso
      this.rolPermisosService.removerPermiso(this.rolSeleccionado, permiso.id!).subscribe({
        next: () => {
          this.cargarPermisosDelRol(this.rolSeleccionado!);
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al remover el permiso');
        }
      });
    } else {
      // Asignar permiso
      this.rolPermisosService.asignarPermiso(this.rolSeleccionado, permiso.id!).subscribe({
        next: () => {
          this.cargarPermisosDelRol(this.rolSeleccionado!);
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al asignar el permiso');
        }
      });
    }
  }

  // ============================================
  // OBTENER NOMBRE DEL ROL SELECCIONADO
  // ============================================
  getNombreRol(): string {
    const rol = this.roles.find(r => r.id === this.rolSeleccionado);
    return rol ? rol.nombre : '';
  }

  // ============================================
  // FILTRAR PERMISOS POR BÚSQUEDA
  // ============================================
  getPermisosFiltrados(): Permiso[] {
    if (!this.searchTerm.trim()) {
      return this.todosLosPermisos;
    }
    
    const term = this.searchTerm.toLowerCase();
    return this.todosLosPermisos.filter(p =>
      p.codigo.toLowerCase().includes(term) ||
      p.nombre.toLowerCase().includes(term) ||
      p.modulo.toLowerCase().includes(term)
    );
  }

  // ============================================
  // AGRUPAR PERMISOS POR MÓDULO
  // ============================================
  getModulosUnicos(): string[] {
    const modulos = new Set(this.todosLosPermisos.map(p => p.modulo));
    return Array.from(modulos).sort();
  }

  getPermisosPorModulo(modulo: string): Permiso[] {
    return this.getPermisosFiltrados().filter(p => p.modulo === modulo);
  }
}