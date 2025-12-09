// src/app/components/configuracion/usuarios/asignar-ubicaciones/asignar-ubicaciones.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioUbicacionesService, UsuarioUbicacion } from '../../../../services/usuarios_plataforma/usuario-ubicaciones/usuario-ubicaciones.service';
import { UsuariosService, Usuario } from '../../../../services/usuarios_plataforma/usuarios.service';
import { UbicacionesService, Ubicacion } from '../../../../services/empresas/ubicaciones.service';

@Component({
  selector: 'app-asignar-ubicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './asignar-ubicaciones.component.html',
  styleUrls: ['./asignar-ubicaciones.component.css']
})
export class AsignarUbicacionesComponent implements OnInit {
  
  // ============================================
  // DATOS
  // ============================================
  asignaciones: UsuarioUbicacion[] = [];
  asignacionesFiltradas: UsuarioUbicacion[] = [];
  usuarios: Usuario[] = [];
  ubicaciones: Ubicacion[] = [];
  loading: boolean = false;
  
  // ============================================
  // BÚSQUEDA Y PAGINACIÓN
  // ============================================
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  Math = Math;

  // ============================================
  // BÚSQUEDA DE USUARIOS
  // ============================================
  busquedaUsuario: string = '';
  usuariosFiltrados: Usuario[] = [];

  // ============================================
  // SELECCIÓN MÚLTIPLE DE UBICACIONES
  // ============================================
  ubicacionesSeleccionadas: number[] = [];
  formularioEnviado: boolean = false;

  // ============================================
  // MODAL DE DETALLES
  // ============================================
  mostrarModalDetalle: boolean = false;
  asignacionDetalle: UsuarioUbicacion | null = null;

  // ============================================
  // MODAL DE FORMULARIO
  // ============================================
  mostrarModalForm: boolean = false;
  modoForm: 'crear' | 'editar' = 'crear';
  formulario!: FormGroup;
  guardando: boolean = false;

  // ============================================
  // MODAL DE HISTORIAL
  // ============================================
  mostrarModalHistorial: boolean = false;
  historial: any[] = [];
  loadingHistorial: boolean = false;

  constructor(
    private asignacionesService: UsuarioUbicacionesService,
    private usuariosService: UsuariosService,
    private ubicacionesService: UbicacionesService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarDatos();
    
    // Inicializar usuarios filtrados
    this.usuariosFiltrados = [...this.usuarios];
  }

  // ============================================
  // FORMULARIO
  // ============================================
  
  inicializarFormulario(): void {
    this.formulario = this.fb.group({
      usuario_id: ['', [Validators.required]],
      activo: [true]
    });
  }

  // ============================================
  // CARGAR DATOS
  // ============================================
  
  async cargarDatos(): Promise<void> {
    this.loading = true;

    try {
      // Cargar datos en paralelo
      const [asignaciones, usuarios, ubicaciones] = await Promise.all([
        this.asignacionesService.listarAsignaciones().toPromise(),
        this.usuariosService.listarUsuarios().toPromise(),
        this.ubicacionesService.getUbicaciones().toPromise()
      ]);

      // Procesar asignaciones
      this.asignaciones = Array.isArray(asignaciones) 
        ? asignaciones 
        : ((asignaciones as any)?.data || []);
      
      // Procesar usuarios (solo activos)
      const usuariosData = Array.isArray(usuarios) 
        ? usuarios 
        : ((usuarios as any)?.data || []);
      this.usuarios = usuariosData.filter((u: any) => u.activo);

      // Procesar ubicaciones (solo activas)
      const ubicacionesData = Array.isArray(ubicaciones) 
        ? ubicaciones 
        : ((ubicaciones as any)?.data || []);
      this.ubicaciones = ubicacionesData.filter((u: any) => u.activo);

      this.totalItems = this.asignaciones.length;
      this.aplicarFiltros();
      
      console.log('✅ Datos cargados:', {
        asignaciones: this.asignaciones.length,
        usuarios: this.usuarios.length,
        ubicaciones: this.ubicaciones.length
      });
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      alert('Error al cargar datos');
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros(): void {
    let filtered = [...this.asignaciones];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.usuario_nombre?.toLowerCase().includes(term) ||
        a.ubicacion_nombre?.toLowerCase().includes(term) ||
        a.usuario_email?.toLowerCase().includes(term)
      );
    }

    this.asignacionesFiltradas = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  buscarAsignaciones(): void {
    this.aplicarFiltros();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================
  
  get paginatedAsignaciones(): UsuarioUbicacion[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.asignacionesFiltradas.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // ============================================
  // MODAL DE DETALLES
  // ============================================
  
  verAsignacion(asignacion: UsuarioUbicacion): void {
    this.asignacionDetalle = asignacion;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.asignacionDetalle = null;
  }

  // ============================================
  // MODAL DE FORMULARIO
  // ============================================
  
  abrirModalCrear(): void {
    this.modoForm = 'crear';
    this.formulario.reset({ activo: true });
    this.busquedaUsuario = '';
    this.usuariosFiltrados = [...this.usuarios];
    this.ubicacionesSeleccionadas = [];
    this.formularioEnviado = false;
    this.mostrarModalForm = true;
  }

  cerrarModalForm(): void {
    this.mostrarModalForm = false;
    this.asignacionDetalle = null;
    this.formulario.reset();
    this.busquedaUsuario = '';
    this.ubicacionesSeleccionadas = [];
    this.formularioEnviado = false;
  }

  guardarAsignacion(): void {
    this.formularioEnviado = true;
    
    // Validar formulario
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    // Validar que haya al menos una ubicación seleccionada
    if (this.ubicacionesSeleccionadas.length === 0) {
      alert('Debes seleccionar al menos una ubicación');
      return;
    }

    this.guardando = true;
    const usuarioId = this.formulario.get('usuario_id')?.value;
    const activo = this.formulario.get('activo')?.value;

    // Crear un arreglo de observables para cada asignación
    const asignaciones$ = this.ubicacionesSeleccionadas.map(ubicacionId => {
      const datos = {
        usuario_id: usuarioId,
        ubicacion_id: ubicacionId,
        activo: activo
      };
      return this.asignacionesService.crearAsignacion(datos);
    });

    // Ejecutar todas las asignaciones en paralelo
    import('rxjs').then(({ forkJoin }) => {
      forkJoin(asignaciones$).subscribe({
        next: (responses) => {
          console.log('✅ Asignaciones creadas:', responses);
          const exitosas = responses.length;
          alert(`${exitosas} asignación(es) creada(s) exitosamente`);
          this.guardando = false;
          this.cerrarModalForm();
          this.cargarDatos();
        },
        error: (error) => {
          console.error('❌ Error al crear asignaciones:', error);
          alert(error.error?.error || 'Error al crear algunas asignaciones');
          this.guardando = false;
          // Recargar datos para ver cuáles sí se crearon
          this.cargarDatos();
        }
      });
    });
  }

  marcarCamposComoTocados(): void {
    Object.keys(this.formulario.controls).forEach(key => {
      this.formulario.get(key)?.markAsTouched();
    });
  }

  tieneError(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  getMensajeError(campo: string): string {
    const control = this.formulario.get(campo);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';

    return 'Campo inválido';
  }

  // ============================================
  // ACCIONES
  // ============================================
  
  eliminarAsignacion(asignacion: UsuarioUbicacion): void {
    if (!asignacion.id) return;

    if (!confirm(`¿Estás seguro de desactivar la asignación de "${asignacion.usuario_nombre}" a "${asignacion.ubicacion_nombre}"?`)) {
      return;
    }

    this.asignacionesService.desactivarAsignacion(asignacion.id).subscribe({
      next: (response) => {
        console.log('✅ Asignación desactivada:', response);
        alert('Asignación desactivada exitosamente');
        this.cargarDatos();
      },
      error: (error) => {
        console.error('❌ Error al desactivar asignación:', error);
        alert(error.error?.error || 'Error al desactivar asignación');
      }
    });
  }

  activarAsignacion(asignacion: UsuarioUbicacion): void {
    if (!asignacion.id) return;

    this.asignacionesService.activarAsignacion(asignacion.id).subscribe({
      next: (response) => {
        console.log('✅ Asignación activada:', response);
        alert('Asignación activada exitosamente');
        this.cargarDatos();
      },
      error: (error) => {
        console.error('❌ Error al activar asignación:', error);
        alert(error.error?.error || 'Error al activar asignación');
      }
    });
  }

  // ============================================
  // MODAL DE HISTORIAL
  // ============================================
  
  verHistorial(asignacion: UsuarioUbicacion): void {
    if (!asignacion.id) return;

    this.asignacionDetalle = asignacion;
    this.mostrarModalHistorial = true;
    this.loadingHistorial = true;

    this.asignacionesService.obtenerHistorial(asignacion.id).subscribe({
      next: (response) => {
        this.historial = response.historial || [];
        this.loadingHistorial = false;
        console.log('✅ Historial cargado:', this.historial.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar historial:', error);
        this.loadingHistorial = false;
        alert('Error al cargar historial');
      }
    });
  }

  cerrarModalHistorial(): void {
    this.mostrarModalHistorial = false;
    this.asignacionDetalle = null;
    this.historial = [];
  }

  // ============================================
  // HELPERS
  // ============================================

  getUsuarioNombre(usuarioId: number): string {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    return usuario?.nombre_usuario || 'Desconocido';
  }

  getUbicacionNombre(ubicacionId: number): string {
    const ubicacion = this.ubicaciones.find(u => u.id === ubicacionId);
    return ubicacion?.nombre || 'Desconocida';
  }

  getAccionColor(accion: string): string {
    const colores: any = {
      'CREATE': 'text-green-600',
      'UPDATE': 'text-blue-600',
      'DELETE': 'text-red-600',
      'REACTIVATE': 'text-green-600',
      'DEACTIVATE': 'text-orange-600'
    };
    return colores[accion] || 'text-gray-600';
  }

  getAccionTexto(accion: string): string {
    const textos: any = {
      'CREATE': 'Creado',
      'UPDATE': 'Actualizado',
      'DELETE': 'Eliminado',
      'REACTIVATE': 'Reactivado',
      'DEACTIVATE': 'Desactivado'
    };
    return textos[accion] || accion;
  }

  // ============================================
  // MÉTODOS PARA BÚSQUEDA DE USUARIOS
  // ============================================

  /**
   * Filtrar usuarios por búsqueda
   */
  filtrarUsuarios(): void {
    if (!this.busquedaUsuario.trim()) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }

    const termino = this.busquedaUsuario.toLowerCase().trim();
    this.usuariosFiltrados = this.usuarios.filter(usuario => 
      usuario.nombre_usuario.toLowerCase().includes(termino) ||
      usuario.email.toLowerCase().includes(termino)
    );
  }

  /**
   * Seleccionar un usuario de la lista
   */
  seleccionarUsuario(usuario: Usuario): void {
    this.formulario.patchValue({ usuario_id: usuario.id });
  }

  // ============================================
  // MÉTODOS PARA SELECCIÓN MÚLTIPLE DE UBICACIONES
  // ============================================

  /**
   * Verificar si una ubicación está seleccionada
   */
  esUbicacionSeleccionada(ubicacionId: number | undefined): boolean {
    if (!ubicacionId) return false;
    return this.ubicacionesSeleccionadas.includes(ubicacionId);
  }

  /**
   * Toggle de selección de ubicación
   */
  toggleUbicacion(ubicacionId: number | undefined): void {
    if (!ubicacionId) return;
    
    const index = this.ubicacionesSeleccionadas.indexOf(ubicacionId);
    if (index > -1) {
      // Si ya está seleccionada, la removemos
      this.ubicacionesSeleccionadas.splice(index, 1);
    } else {
      // Si no está seleccionada, la agregamos
      this.ubicacionesSeleccionadas.push(ubicacionId);
    }
  }

  /**
   * Limpiar todas las ubicaciones seleccionadas
   */
  limpiarUbicaciones(): void {
    this.ubicacionesSeleccionadas = [];
  }

  /**
   * Exportar a CSV (placeholder)
   */
  exportarCSV(): void {
    alert('Funcionalidad de exportación CSV próximamente');
  }

  /**
   * Exportar a Excel (placeholder)
   */
  exportarExcel(): void {
    alert('Funcionalidad de exportación Excel próximamente');
  }
}