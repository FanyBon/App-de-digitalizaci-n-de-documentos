// src/app/components/configuracion/usuarios/lista-perfiles/lista-perfiles.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PerfilesService, Perfil } from '../../../../services/usuarios_plataforma/perfiles.service';

@Component({
  selector: 'app-lista-perfiles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './lista-perfiles.component.html',
  styleUrls: ['./lista-perfiles.component.css']
})
export class ListaPerfilesComponent implements OnInit {
  
  // ============================================
  // DATOS
  // ============================================
  perfiles: Perfil[] = [];
  perfilesFiltrados: Perfil[] = [];
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
  perfilDetalle: Perfil | null = null;

  // ============================================
  // MODAL DE FORMULARIO
  // ============================================
  mostrarModalForm: boolean = false;
  modoForm: 'crear' | 'editar' = 'crear';
  formulario!: FormGroup;
  guardando: boolean = false;

  constructor(
    private perfilesService: PerfilesService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarPerfiles();
  }

  // ============================================
  // FORMULARIO
  // ============================================
  
  inicializarFormulario(): void {
    this.formulario = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // ============================================
  // CARGAR DATOS
  // ============================================
  
  cargarPerfiles(): void {
    this.loading = true;

    this.perfilesService.listarPerfiles().subscribe({
      next: (data: any) => {
        this.perfiles = Array.isArray(data) ? data : (data.data || []);
        this.totalItems = this.perfiles.length;
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Perfiles cargados:', this.perfiles.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar perfiles:', error);
        this.loading = false;
        alert('Error al cargar perfiles');
      }
    });
  }

  aplicarFiltros(): void {
    let filtered = [...this.perfiles];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.descripcion.toLowerCase().includes(term)
      );
    }

    this.perfilesFiltrados = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  buscarPerfiles(): void {
    this.aplicarFiltros();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================
  
  get paginatedPerfiles(): Perfil[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.perfilesFiltrados.slice(start, end);
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
  
  verPerfil(perfil: Perfil): void {
    this.perfilDetalle = perfil;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.perfilDetalle = null;
  }

  // ============================================
  // MODAL DE FORMULARIO
  // ============================================
  
  abrirModalCrear(): void {
    this.modoForm = 'crear';
    this.formulario.reset();
    this.mostrarModalForm = true;
  }

  abrirModalEditar(perfil: Perfil): void {
    this.modoForm = 'editar';
    this.perfilDetalle = perfil;
    
    this.formulario.patchValue({
      nombre: perfil.nombre,
      descripcion: perfil.descripcion
    });
    
    this.mostrarModalForm = true;
  }

  cerrarModalForm(): void {
    this.mostrarModalForm = false;
    this.perfilDetalle = null;
    this.formulario.reset();
  }

  guardarPerfil(): void {
    if (this.formulario.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.guardando = true;
    const datos = this.formulario.value;

    const operacion = this.modoForm === 'crear'
      ? this.perfilesService.crearPerfil(datos)
      : this.perfilesService.editarPerfil(this.perfilDetalle!.id, datos);

    operacion.subscribe({
      next: (response) => {
        console.log('✅ Perfil guardado:', response);
        alert(`Perfil ${this.modoForm === 'crear' ? 'creado' : 'actualizado'} exitosamente`);
        this.guardando = false;
        this.cerrarModalForm();
        this.cargarPerfiles();
      },
      error: (error) => {
        console.error('❌ Error al guardar perfil:', error);
        alert(error.error?.error || 'Error al guardar perfil');
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
    return this.modoForm === 'crear' ? 'Nuevo Perfil' : 'Editar Perfil';
  }

  get iconoModal(): string {
    return this.modoForm === 'crear' ? 'fa-plus-circle' : 'fa-edit';
  }

  // ============================================
  // ACCIONES
  // ============================================
  
  eliminarPerfil(perfil: Perfil): void {
    if (!confirm(`¿Estás seguro de eliminar el perfil "${perfil.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.perfilesService.eliminarPerfil(perfil.id).subscribe({
      next: (response) => {
        console.log('✅ Perfil eliminado:', response);
        alert('Perfil eliminado exitosamente');
        this.cargarPerfiles();
      },
      error: (error) => {
        console.error('❌ Error al eliminar perfil:', error);
        alert(error.error?.error || 'Error al eliminar perfil');
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