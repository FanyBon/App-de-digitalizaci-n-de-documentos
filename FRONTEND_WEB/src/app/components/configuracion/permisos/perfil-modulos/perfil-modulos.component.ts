// src/app/components/configuracion/permisos/perfil-modulos/perfil-modulos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { PerfilModulosService, PerfilModuloDetallado } from '../../../../services/usuarios_plataforma/Permisos/perfil-modulos.service';
import { ModulosFrontendService, ModuloFrontendDetallado } from '../../../../services/usuarios_plataforma/Permisos/modulos-frontend.service';

// Interfaz para Perfil
interface Perfil {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  es_sistema?: boolean;
}

@Component({
  selector: 'app-perfil-modulos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil-modulos.component.html',
  styleUrls: ['./perfil-modulos.component.css']
})
export class PerfilModulosComponent implements OnInit {
  // ============================================
  // DATOS
  // ============================================
  perfiles: Perfil[] = [];
  perfilSeleccionado: number | null = null;
  modulosDelPerfil: PerfilModuloDetallado[] = [];
  todosLosModulos: ModuloFrontendDetallado[] = [];

  // ============================================
  // ESTADOS
  // ============================================
  loading: boolean = false;
  loadingPerfiles: boolean = false;
  loadingModulos: boolean = false;
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
    private perfilModulosService: PerfilModulosService,
    private modulosService: ModulosFrontendService
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

    // Cargar perfiles y módulos en paralelo
    Promise.all([
      this.cargarPerfiles(),
      this.cargarModulos()
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
  // CARGAR PERFILES DESDE LA BD
  // ============================================
  cargarPerfiles(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingPerfiles = true;

      this.http.get<{ success: boolean; data: Perfil[] }>(
        `${this.apiUrl}/perfiles`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (response) => {
          // Filtrar solo perfiles activos
          this.perfiles = (response.data || []).filter(p => p.activo);
          this.loadingPerfiles = false;
          console.log('✅ Perfiles cargados:', this.perfiles.length);
          resolve();
        },
        error: (err) => {
          console.error('❌ Error al cargar perfiles:', err);
          this.loadingPerfiles = false;
          this.error = 'Error al cargar los perfiles';
          reject(err);
        }
      });
    });
  }

  // ============================================
  // CARGAR MÓDULOS
  // ============================================
  cargarModulos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingModulos = true;

      this.modulosService.listarModulos().subscribe({
        next: (response) => {
          // Filtrar solo módulos activos
          this.todosLosModulos = (response.data || []).filter((m: ModuloFrontendDetallado) => m.activo);
          this.loadingModulos = false;
          console.log('✅ Módulos cargados:', this.todosLosModulos.length);
          resolve();
        },
        error: (err) => {
          console.error('❌ Error al cargar módulos:', err);
          this.loadingModulos = false;
          reject(err);
        }
      });
    });
  }

  // ============================================
  // SELECCIONAR PERFIL
  // ============================================
  seleccionarPerfil(perfilId: number) {
    this.perfilSeleccionado = perfilId;
    this.cargarModulosDelPerfil(perfilId);
  }

  // ============================================
  // CARGAR MÓDULOS DEL PERFIL SELECCIONADO
  // ============================================
  cargarModulosDelPerfil(perfilId: number) {
    this.loading = true;
    
    this.perfilModulosService.listarModulosDePerfil(perfilId).subscribe({
      next: (response) => {
        this.modulosDelPerfil = response.data || [];
        this.loading = false;
        console.log(`✅ Módulos del perfil ${perfilId}:`, this.modulosDelPerfil.length);
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.error = 'Error al cargar los módulos del perfil';
        this.loading = false;
      }
    });
  }

  // ============================================
  // VERIFICAR SI TIENE MÓDULO
  // ============================================
  tieneModulo(moduloId: number): boolean {
    return this.modulosDelPerfil.some(m => m.modulo_id === moduloId && m.activo);
  }

  // ============================================
  // TOGGLE MÓDULO (ASIGNAR/REMOVER)
  // ============================================
  toggleModulo(modulo: ModuloFrontendDetallado) {
    if (!this.perfilSeleccionado) return;

    const tieneModulo = this.tieneModulo(modulo.id!);

    if (tieneModulo) {
      // Remover módulo
      this.perfilModulosService.removerModulo(this.perfilSeleccionado, modulo.id!).subscribe({
        next: () => {
          this.cargarModulosDelPerfil(this.perfilSeleccionado!);
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al remover el módulo');
        }
      });
    } else {
      // Asignar módulo
      this.perfilModulosService.asignarModulo(this.perfilSeleccionado, modulo.id!).subscribe({
        next: () => {
          this.cargarModulosDelPerfil(this.perfilSeleccionado!);
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al asignar el módulo');
        }
      });
    }
  }

  // ============================================
  // OBTENER NOMBRE DEL PERFIL SELECCIONADO
  // ============================================
  getNombrePerfil(): string {
    const perfil = this.perfiles.find(p => p.id === this.perfilSeleccionado);
    return perfil ? perfil.nombre : '';
  }

  // ============================================
  // FILTRAR MÓDULOS POR BÚSQUEDA
  // ============================================
  getModulosFiltrados(): ModuloFrontendDetallado[] {
    if (!this.searchTerm.trim()) {
      return this.todosLosModulos;
    }
    
    const term = this.searchTerm.toLowerCase();
    return this.todosLosModulos.filter(m =>
      m.codigo.toLowerCase().includes(term) ||
      m.nombre.toLowerCase().includes(term) ||
      m.ruta?.toLowerCase().includes(term)
    );
  }

  // ============================================
  // AGRUPAR MÓDULOS POR PADRE
  // ============================================
  getModulosPrincipales(): ModuloFrontendDetallado[] {
    return this.getModulosFiltrados().filter(m => !m.padre_id);
  }

  getSubmodulos(padreId: number): ModuloFrontendDetallado[] {
    return this.getModulosFiltrados().filter(m => m.padre_id === padreId);
  }

  // ============================================
  // CONTAR SUBMÓDULOS ASIGNADOS
  // ============================================
  contarSubmodulosAsignados(padreId: number): number {
    const submodulos = this.getSubmodulos(padreId);
    return submodulos.filter(m => this.tieneModulo(m.id!)).length;
  }

  // ============================================
  // SELECCIONAR/DESELECCIONAR TODOS LOS SUBMÓDULOS
  // ============================================
  toggleTodosSubmodulos(padreId: number) {
    if (!this.perfilSeleccionado) return;

    const submodulos = this.getSubmodulos(padreId);
    const todosAsignados = submodulos.every(m => this.tieneModulo(m.id!));

    // Si todos están asignados, remover todos; si no, asignar todos
    const operaciones = submodulos.map(modulo => {
      if (todosAsignados) {
        return this.perfilModulosService.removerModulo(this.perfilSeleccionado!, modulo.id!).toPromise();
      } else if (!this.tieneModulo(modulo.id!)) {
        return this.perfilModulosService.asignarModulo(this.perfilSeleccionado!, modulo.id!).toPromise();
      }
      return Promise.resolve();
    });

    Promise.all(operaciones).then(() => {
      this.cargarModulosDelPerfil(this.perfilSeleccionado!);
    }).catch(err => {
      console.error('❌ Error:', err);
      alert('Error al modificar los módulos');
    });
  }
}