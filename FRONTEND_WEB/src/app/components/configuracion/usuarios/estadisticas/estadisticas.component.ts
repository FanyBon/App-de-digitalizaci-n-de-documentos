// src/app/components/configuracion/usuarios/estadisticas/estadisticas.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { UsuariosService } from '../../../../services/usuarios_plataforma/usuarios.service';
import { RolesService } from '../../../../services/usuarios_plataforma/roles.service';
import { PerfilesService } from '../../../../services/usuarios_plataforma/perfiles.service';
import { EmpresasService } from '../../../../services/empresas/empresas.service';

// Registrar Chart.js
Chart.register(...registerables);

interface EstadisticasData {
  totalUsuarios: number;
  totalRoles: number;
  totalPerfiles: number;
  totalEmpresas: number;
  usuariosActivos: number;
  usuariosInactivos: number;
  usuariosSistema: number;
  usuariosPorEmpresa: { nombre: string; cantidad: number }[];
  usuariosPorRol: { nombre: string; cantidad: number }[];
  cambioUsuariosMes: number;
  cambioPerfilesMes: number;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.css']
})
export class EstadisticasComponent implements OnInit, OnDestroy {
  
  // Para exponer Math en el template
  Math = Math;
  
  // ============================================
  // DATOS
  // ============================================
  loading: boolean = true;
  estadisticas: EstadisticasData = {
    totalUsuarios: 0,
    totalRoles: 0,
    totalPerfiles: 0,
    totalEmpresas: 0,
    usuariosActivos: 0,
    usuariosInactivos: 0,
    usuariosSistema: 0,
    usuariosPorEmpresa: [],
    usuariosPorRol: [],
    cambioUsuariosMes: 0,
    cambioPerfilesMes: 0
  };

  // ============================================
  // GRÁFICAS
  // ============================================
  chartEstado: Chart | null = null;
  chartEmpresas: Chart | null = null;

  // ============================================
  // REFRESH AUTOMÁTICO
  // ============================================
  private refreshInterval: any;

  constructor(
    private usuariosService: UsuariosService,
    private rolesService: RolesService,
    private perfilesService: PerfilesService,
    private empresasService: EmpresasService
  ) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
    
    // Refresh automático cada 5 minutos
    this.refreshInterval = setInterval(() => {
      this.cargarEstadisticas();
    }, 300000); // 5 minutos
  }

  ngOnDestroy(): void {
    // Limpiar interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Destruir gráficas
    if (this.chartEstado) {
      this.chartEstado.destroy();
    }
    if (this.chartEmpresas) {
      this.chartEmpresas.destroy();
    }
  }

  // ============================================
  // CARGAR DATOS
  // ============================================
  
  async cargarEstadisticas(): Promise<void> {
    this.loading = true;

    try {
      // Cargar todos los datos en paralelo
      const [usuarios, roles, perfiles, empresas] = await Promise.all([
        this.usuariosService.listarUsuarios().toPromise(),
        this.rolesService.listarRoles().toPromise(),
        this.perfilesService.listarPerfiles().toPromise(),
        this.empresasService.listarEmpresas().toPromise()
      ]);

      // Procesar usuarios - verificar si viene como array o con propiedad data
      const usuariosArray = Array.isArray(usuarios) ? usuarios : ((usuarios as any)?.data || []);
      const rolesArray = Array.isArray(roles) ? roles : ((roles as any)?.data || []);
      const perfilesArray = Array.isArray(perfiles) ? perfiles : ((perfiles as any)?.data || []);
      const empresasArray = Array.isArray(empresas) ? empresas : ((empresas as any)?.data || []);

      this.estadisticas.totalUsuarios = usuariosArray.length;
      this.estadisticas.totalRoles = rolesArray.length;
      this.estadisticas.totalPerfiles = perfilesArray.length;
      this.estadisticas.totalEmpresas = empresasArray.length;

      // Usuarios activos/inactivos
      this.estadisticas.usuariosActivos = usuariosArray.filter((u: any) => u.activo).length;
      this.estadisticas.usuariosInactivos = usuariosArray.filter((u: any) => !u.activo).length;

      // Usuarios del sistema
      this.estadisticas.usuariosSistema = usuariosArray.filter((u: any) => u.es_sistema).length;

      // Usuarios por empresa
      const empresasMap = new Map<string, number>();
      usuariosArray.forEach((u: any) => {
        const empresa = u.empresa_nombre || 'Sin empresa';
        empresasMap.set(empresa, (empresasMap.get(empresa) || 0) + 1);
      });
      this.estadisticas.usuariosPorEmpresa = Array.from(empresasMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      // Usuarios por rol
      const rolesMap = new Map<string, number>();
      usuariosArray.forEach((u: any) => {
        if (u.roles && u.roles.length > 0) {
          u.roles.forEach((rol: any) => {
            rolesMap.set(rol.nombre, (rolesMap.get(rol.nombre) || 0) + 1);
          });
        } else {
          rolesMap.set('Sin rol', (rolesMap.get('Sin rol') || 0) + 1);
        }
      });
      this.estadisticas.usuariosPorRol = Array.from(rolesMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      // Simular cambios del mes (TODO: implementar con datos reales)
      this.estadisticas.cambioUsuariosMes = Math.floor(Math.random() * 20) + 1;
      this.estadisticas.cambioPerfilesMes = Math.floor(Math.random() * 5);

      console.log('✅ Estadísticas cargadas:', this.estadisticas);

      // Crear gráficas
      setTimeout(() => {
        this.crearGraficaEstado();
        this.crearGraficaEmpresas();
      }, 100);

    } catch (error) {
      console.error('❌ Error al cargar estadísticas:', error);
    } finally {
      this.loading = false;
    }
  }

  // ============================================
  // GRÁFICAS
  // ============================================
  
  crearGraficaEstado(): void {
    const canvas = document.getElementById('chartEstado') as HTMLCanvasElement;
    if (!canvas) return;

    // Destruir gráfica anterior si existe
    if (this.chartEstado) {
      this.chartEstado.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Activos', 'Inactivos'],
        datasets: [{
          data: [this.estadisticas.usuariosActivos, this.estadisticas.usuariosInactivos],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = this.estadisticas.totalUsuarios;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.chartEstado = new Chart(ctx, config);
  }

  crearGraficaEmpresas(): void {
    const canvas = document.getElementById('chartEmpresas') as HTMLCanvasElement;
    if (!canvas) return;

    // Destruir gráfica anterior si existe
    if (this.chartEmpresas) {
      this.chartEmpresas.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = this.estadisticas.usuariosPorEmpresa.map(e => e.nombre);
    const data = this.estadisticas.usuariosPorEmpresa.map(e => e.cantidad);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Usuarios',
          data: data,
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `Usuarios: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };

    this.chartEmpresas = new Chart(ctx, config);
  }

  // ============================================
  // HELPERS Y GETTERS
  // ============================================
  
  get porcentajeActivos(): number {
    if (this.estadisticas.totalUsuarios === 0) return 0;
    return Math.round((this.estadisticas.usuariosActivos / this.estadisticas.totalUsuarios) * 100);
  }

  get porcentajeInactivos(): number {
    if (this.estadisticas.totalUsuarios === 0) return 0;
    return Math.round((this.estadisticas.usuariosInactivos / this.estadisticas.totalUsuarios) * 100);
  }

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  refrescarDatos(): void {
    this.cargarEstadisticas();
  }

  exportarPDF(): void {
    alert('Funcionalidad de exportación a PDF próximamente');
  }

  exportarExcel(): void {
    alert('Funcionalidad de exportación a Excel próximamente');
  }
}