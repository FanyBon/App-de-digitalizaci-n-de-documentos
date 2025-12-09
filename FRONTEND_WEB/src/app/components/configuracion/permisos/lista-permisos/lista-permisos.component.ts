// src/app/components/configuracion/permisos/lista-permisos/lista-permisos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PermisosService, Permiso } from '../../../../services/usuarios_plataforma/Permisos/permisos.service';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lista-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-permisos.component.html',
  styleUrls: ['./lista-permisos.component.css']
})
export class ListaPermisosComponent implements OnInit {
  // Permitir Math en template
  Math = Math;

  // ============================================
  // DATOS
  // ============================================
  permisos: Permiso[] = [];
  permisosFiltrados: Permiso[] = [];
  permisosPaginados: Permiso[] = [];

  // ============================================
  // ESTADOS
  // ============================================
  loading: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // ============================================
  // FILTROS
  // ============================================
  searchTerm: string = '';
  filtroModulo: string = 'todos';
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'activos';
  modulosUnicos: string[] = [];

  // ============================================
  // PAGINACIÓN
  // ============================================
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  opcionesPaginacion: number[] = [10, 25, 50, 100];

  // ============================================
  // MODAL
  // ============================================
  showModal: boolean = false;
  modoEdicion: boolean = false;
  permisoForm: Partial<Permiso> = this.inicializarFormulario();

  constructor(private permisosService: PermisosService) {}

  ngOnInit() {
    this.cargarPermisos();
  }

  // ============================================
  // INICIALIZAR FORMULARIO
  // ============================================
  inicializarFormulario(): Partial<Permiso> {
    return {
      codigo: '',
      nombre: '',
      descripcion: '',
      modulo: '',
      accion: '',
      metodo: '',
      ruta: '',
      es_sistema: false
    };
  }

  // ============================================
  // CARGAR DATOS
  // ============================================
  cargarPermisos() {
    this.loading = true;
    this.error = '';

    this.permisosService.listarPermisos().subscribe({
      next: (response) => {
        this.permisos = response.data || [];
        
        // Extraer módulos únicos para el filtro
        this.modulosUnicos = [...new Set(this.permisos.map(p => p.modulo))].sort();
        
        this.aplicarFiltros();
        this.loading = false;
        this.inicioCargaCompleto = true;
        console.log('✅ Permisos cargados:', this.permisos.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar permisos:', err);
        this.error = 'Error al cargar los permisos';
        this.loading = false;
        this.inicioCargaCompleto = true;
      }
    });
  }

  // ============================================
  // FILTROS
  // ============================================
  aplicarFiltros() {
    let resultado = [...this.permisos];

    // Filtro por estado
    if (this.filtroActivo === 'activos') {
      resultado = resultado.filter(p => p.activo);
    } else if (this.filtroActivo === 'inactivos') {
      resultado = resultado.filter(p => !p.activo);
    }

    // Filtro por módulo
    if (this.filtroModulo !== 'todos') {
      resultado = resultado.filter(p => p.modulo === this.filtroModulo);
    }

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(p =>
        p.codigo.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        p.modulo.toLowerCase().includes(term) ||
        p.accion.toLowerCase().includes(term)
      );
    }

    this.permisosFiltrados = resultado;
    this.calcularPaginacion();
  }

  onSearchChange() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  cambiarFiltroActivo(filtro: 'todos' | 'activos' | 'inactivos') {
    this.filtroActivo = filtro;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  cambiarFiltroModulo(modulo: string) {
    this.filtroModulo = modulo;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.permisosFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = 1;
    }
    this.actualizarPagina();
  }

  actualizarPagina() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.permisosPaginados = this.permisosFiltrados.slice(inicio, fin);
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPagina();
    }
  }

  cambiarItemsPorPagina(items: number) {
    this.itemsPorPagina = items;
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const maxPaginasVisibles = 5;

    if (this.totalPaginas === 0) return paginas;

    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginasVisibles / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginasVisibles - 1);

    if (fin - inicio < maxPaginasVisibles - 1) {
      inicio = Math.max(1, fin - maxPaginasVisibles + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  // ============================================
  // MODAL CRUD
  // ============================================
  abrirModalNuevo() {
    this.modoEdicion = false;
    this.permisoForm = this.inicializarFormulario();
    this.showModal = true;
  }

  abrirModalEditar(permiso: Permiso) {
    this.modoEdicion = true;
    this.permisoForm = { ...permiso };
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.permisoForm = this.inicializarFormulario();
  }

  guardarPermiso() {
    if (!this.validarFormulario()) return;

    this.loading = true;

    const payload = {
      codigo: this.permisoForm.codigo!,
      nombre: this.permisoForm.nombre!,
      descripcion: this.permisoForm.descripcion || '',
      modulo: this.permisoForm.modulo!,
      accion: this.permisoForm.accion!,
      metodo: this.permisoForm.metodo || '',
      ruta: this.permisoForm.ruta || ''
    };

    if (this.modoEdicion && this.permisoForm.id) {
      this.permisosService.actualizarPermiso(this.permisoForm.id, payload).subscribe({
        next: () => {
          this.cargarPermisos();
          this.cerrarModal();
          alert('Permiso actualizado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al actualizar el permiso');
          this.loading = false;
        }
      });
    } else {
      this.permisosService.crearPermiso(payload).subscribe({
        next: () => {
          this.cargarPermisos();
          this.cerrarModal();
          alert('Permiso creado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al crear el permiso');
          this.loading = false;
        }
      });
    }
  }

  validarFormulario(): boolean {
    if (!this.permisoForm.codigo?.trim()) {
      alert('El código es obligatorio');
      return false;
    }
    if (!this.permisoForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!this.permisoForm.modulo?.trim()) {
      alert('El módulo es obligatorio');
      return false;
    }
    if (!this.permisoForm.accion?.trim()) {
      alert('La acción es obligatoria');
      return false;
    }
    return true;
  }

  // ============================================
  // ACCIONES
  // ============================================
  cambiarEstatus(permiso: Permiso) {
    const nuevoEstatus = !permiso.activo;
    const accion = nuevoEstatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} el permiso "${permiso.nombre}"?`)) {
      return;
    }

    this.permisosService.cambiarEstatus(permiso.id!, nuevoEstatus).subscribe({
      next: () => {
        this.cargarPermisos();
        alert(`Permiso ${nuevoEstatus ? 'activado' : 'desactivado'} exitosamente`);
      },
      error: (err) => {
        console.error('❌ Error:', err);
        alert(err.error?.error || 'Error al cambiar el estado');
      }
    });
  }

  eliminarPermiso(permiso: Permiso) {
    if (permiso.es_sistema) {
      alert('No se puede eliminar un permiso del sistema');
      return;
    }

    if (!confirm(`¿Eliminar permanentemente el permiso "${permiso.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.permisosService.eliminarPermiso(permiso.id!).subscribe({
      next: () => {
        this.cargarPermisos();
        alert('Permiso eliminado exitosamente');
      },
      error: (err) => {
        console.error('❌ Error:', err);
        alert(err.error?.error || 'Error al eliminar el permiso');
      }
    });
  }

  // ============================================
  // EXPORTACIÓN
  // ============================================
  exportarCSV() {
    if (this.permisosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datos = this.permisosFiltrados.map(p => ({
      'Código': p.codigo,
      'Nombre': p.nombre,
      'Módulo': p.modulo,
      'Acción': p.accion,
      'Es Sistema': p.es_sistema ? 'Sí' : 'No',
      'Estado': p.activo ? 'Activo' : 'Inactivo'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `permisos_${fecha}.csv`);
  }

  exportarExcel() {
    if (this.permisosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datos = this.permisosFiltrados.map(p => ({
      'Código': p.codigo,
      'Nombre': p.nombre,
      'Descripción': p.descripcion || '',
      'Módulo': p.modulo,
      'Acción': p.accion,
      'Método HTTP': p.metodo || '',
      'Ruta API': p.ruta || '',
      'Es Sistema': p.es_sistema ? 'Sí' : 'No',
      'Estado': p.activo ? 'Activo' : 'Inactivo'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Permisos');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `permisos_${fecha}.xlsx`);
  }

  // ============================================
  // HELPERS
  // ============================================
  getBadgeEstado(activo: boolean): string {
    return activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getBadgeSistema(esSistema: boolean): string {
    return esSistema ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
  }
}