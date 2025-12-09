// src/app/components/configuracion/usuarios/lista-roles/lista-roles.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RolesService, Role } from '../../../../services/usuarios_plataforma/roles.service';

@Component({
  selector: 'app-lista-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './lista-roles.component.html',
  styleUrls: ['./lista-roles.component.css']
})
export class ListaRolesComponent implements OnInit {

  // ============================================
  // DATOS
  // ============================================
  roles: Role[] = [];
  rolesFiltrados: Role[] = [];
  loading: boolean = false;

  // ============================================
  // BÚSQUEDA
  // ============================================
  searchTerm: string = '';

  // ============================================
  // PAGINACIÓN
  // ============================================
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  Math = Math;

  // ============================================
  // MODAL DE DETALLES
  // ============================================
  mostrarModalDetalle: boolean = false;
  rolDetalle: Role | null = null;

  // ============================================
  // MODAL DE FORMULARIO
  // ============================================
  mostrarModalForm: boolean = false;
  modoForm: 'crear' | 'editar' = 'crear';
  formulario!: FormGroup;
  guardando: boolean = false;

  constructor(
    private rolesService: RolesService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarRoles();
  }

  // ============================================
  // FORMULARIO
  // ============================================

  inicializarFormulario(): void {
    this.formulario = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      es_sistema: [false]  // ← AGREGAR ESTA LÍNEA
    });
  }

  // ============================================
  // CARGAR DATOS
  // ============================================

  cargarRoles(): void {
    this.loading = true;

    this.rolesService.listarRoles().subscribe({
      next: (data: any) => {
        this.roles = Array.isArray(data) ? data : (data.data || []);
        this.totalItems = this.roles.length;
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Roles cargados:', this.roles.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar roles:', error);
        this.loading = false;
        alert('Error al cargar roles');
      }
    });
  }

  aplicarFiltros(): void {
    let filtered = [...this.roles];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.nombre.toLowerCase().includes(term)
      );
    }

    this.rolesFiltrados = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  buscarRoles(): void {
    this.aplicarFiltros();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  get paginatedRoles(): Role[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.rolesFiltrados.slice(start, end);
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

  verRol(rol: Role): void {
    this.rolDetalle = rol;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.rolDetalle = null;
  }

  // ============================================
  // MODAL DE FORMULARIO
  // ============================================

  abrirModalCrear(): void {
    this.modoForm = 'crear';
    this.formulario.reset();
    this.mostrarModalForm = true;
  }

  abrirModalEditar(rol: Role): void {
    this.modoForm = 'editar';
    this.rolDetalle = rol;

    this.formulario.patchValue({
      nombre: rol.nombre,
      es_sistema: (rol as any).es_sistema || false  // ← AGREGAR ESTA LÍNEA
    });

    this.mostrarModalForm = true;
  }

  cerrarModalForm(): void {
    this.mostrarModalForm = false;
    this.rolDetalle = null;
    this.formulario.reset();
  }

  guardarRol(): void {
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.guardando = true;
    const datos = this.formulario.value;

    const operacion = this.modoForm === 'crear'
      ? this.rolesService.crearRol(datos)
      : this.rolesService.editarRol(this.rolDetalle!.id, datos);

    operacion.subscribe({
      next: (response) => {
        console.log('✅ Rol guardado:', response);
        alert(`Rol ${this.modoForm === 'crear' ? 'creado' : 'actualizado'} exitosamente`);
        this.guardando = false;
        this.cerrarModalForm();
        this.cargarRoles();
      },
      error: (error) => {
        console.error('❌ Error al guardar rol:', error);
        alert(error.error?.error || 'Error al guardar rol');
        this.guardando = false;
      }
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
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return 'Campo inválido';
  }

  get tituloModal(): string {
    return this.modoForm === 'crear' ? 'Nuevo Rol' : 'Editar Rol';
  }

  get iconoModal(): string {
    return this.modoForm === 'crear' ? 'fa-plus-circle' : 'fa-edit';
  }

  // ============================================
  // ACCIONES
  // ============================================

  eliminarRol(rol: Role): void {
    if (!confirm(`¿Estás seguro de eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.rolesService.eliminarRol(rol.id).subscribe({
      next: (response) => {
        console.log('✅ Rol eliminado:', response);
        alert('Rol eliminado exitosamente');
        this.cargarRoles();
      },
      error: (error) => {
        console.error('❌ Error al eliminar rol:', error);
        alert(error.error?.error || 'Error al eliminar rol');
      }
    });
  }

  exportarCSV(): void {
    alert('Funcionalidad de exportación CSV próximamente');
  }

  exportarExcel(): void {
    alert('Funcionalidad de exportación Excel próximamente');
  }
}