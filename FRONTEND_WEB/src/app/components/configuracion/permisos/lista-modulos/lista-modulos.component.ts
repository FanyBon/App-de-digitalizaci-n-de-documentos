// src/app/components/configuracion/permisos/lista-modulos/lista-modulos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ModulosFrontendService, ModuloFrontendDetallado } from '../../../../services/usuarios_plataforma/Permisos/modulos-frontend.service';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lista-modulos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-modulos.component.html',
  styleUrls: ['./lista-modulos.component.css']
})
export class ListaModulosComponent implements OnInit {
  // Permitir Math en template
  Math = Math;

  // ============================================
  // DATOS
  // ============================================
  modulos: ModuloFrontendDetallado[] = [];
  modulosFiltrados: ModuloFrontendDetallado[] = [];
  modulosPaginados: ModuloFrontendDetallado[] = [];
  modulosPadre: ModuloFrontendDetallado[] = [];

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
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'activos';
  filtroPadre: number | null | 'todos' = 'todos';

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
  moduloForm: any = this.inicializarFormulario();

  constructor(private modulosService: ModulosFrontendService) {}

  ngOnInit() {
    this.cargarModulos();
  }

  // ============================================
  // INICIALIZAR FORMULARIO
  // ============================================
  inicializarFormulario(): any {
    return {
      id: null,
      codigo: '',
      nombre: '',
      descripcion: '',
      icono: '',
      ruta: '',
      padre_id: null,
      orden: 0,
      es_sistema: false
    };
  }

  // ============================================
  // CARGAR DATOS
  // ============================================
  cargarModulos() {
    this.loading = true;
    this.error = '';

    this.modulosService.listarModulos().subscribe({
      next: (response) => {
        this.modulos = response.data || [];
        
        // Filtrar módulos padre para el select
        this.modulosPadre = this.modulos.filter(m => !m.padre_id);
        
        this.aplicarFiltros();
        this.loading = false;
        this.inicioCargaCompleto = true;
        console.log('✅ Módulos cargados:', this.modulos.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar módulos:', err);
        this.error = 'Error al cargar los módulos';
        this.loading = false;
        this.inicioCargaCompleto = true;
      }
    });
  }

  // ============================================
  // FILTROS
  // ============================================
  aplicarFiltros() {
    let resultado = [...this.modulos];

    // Filtro por estado
    if (this.filtroActivo === 'activos') {
      resultado = resultado.filter(m => m.activo);
    } else if (this.filtroActivo === 'inactivos') {
      resultado = resultado.filter(m => !m.activo);
    }

    // Filtro por padre
    if (this.filtroPadre !== 'todos') {
      if (this.filtroPadre === null) {
        resultado = resultado.filter(m => !m.padre_id);
      } else {
        resultado = resultado.filter(m => m.padre_id === this.filtroPadre);
      }
    }

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(m =>
        m.codigo.toLowerCase().includes(term) ||
        m.nombre.toLowerCase().includes(term) ||
        m.ruta?.toLowerCase().includes(term)
      );
    }

    this.modulosFiltrados = resultado;
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

  // ============================================
  // PAGINACIÓN
  // ============================================
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.modulosFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = 1;
    }
    this.actualizarPagina();
  }

  actualizarPagina() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.modulosPaginados = this.modulosFiltrados.slice(inicio, fin);
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
    this.moduloForm = this.inicializarFormulario();
    this.showModal = true;
  }

  abrirModalEditar(modulo: ModuloFrontendDetallado) {
    this.modoEdicion = true;
    this.moduloForm = { ...modulo };
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.moduloForm = this.inicializarFormulario();
  }

  guardarModulo() {
    if (!this.validarFormulario()) return;

    this.loading = true;

    const payload = {
      codigo: this.moduloForm.codigo,
      nombre: this.moduloForm.nombre,
      descripcion: this.moduloForm.descripcion || '',
      icono: this.moduloForm.icono || '',
      ruta: this.moduloForm.ruta || '',
      padre_id: this.moduloForm.padre_id || null,
      orden: this.moduloForm.orden || 0
    };

    if (this.modoEdicion && this.moduloForm.id) {
      this.modulosService.actualizarModulo(this.moduloForm.id, payload).subscribe({
        next: () => {
          this.cargarModulos();
          this.cerrarModal();
          alert('Módulo actualizado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al actualizar el módulo');
          this.loading = false;
        }
      });
    } else {
      this.modulosService.crearModulo(payload).subscribe({
        next: () => {
          this.cargarModulos();
          this.cerrarModal();
          alert('Módulo creado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error:', err);
          alert(err.error?.error || 'Error al crear el módulo');
          this.loading = false;
        }
      });
    }
  }

  validarFormulario(): boolean {
    if (!this.moduloForm.codigo?.trim()) {
      alert('El código es obligatorio');
      return false;
    }
    if (!this.moduloForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    return true;
  }

  // ============================================
  // ACCIONES
  // ============================================
  cambiarEstatus(modulo: ModuloFrontendDetallado) {
    const nuevoEstatus = !modulo.activo;
    const accion = nuevoEstatus ? 'activar' : 'desactivar';
    
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} el módulo "${modulo.nombre}"?`)) {
      return;
    }

    this.modulosService.cambiarEstatus(modulo.id!, nuevoEstatus).subscribe({
      next: () => {
        this.cargarModulos();
        alert(`Módulo ${nuevoEstatus ? 'activado' : 'desactivado'} exitosamente`);
      },
      error: (err) => {
        console.error('❌ Error:', err);
        alert(err.error?.error || 'Error al cambiar el estado');
      }
    });
  }

  eliminarModulo(modulo: ModuloFrontendDetallado) {
    if (modulo.es_sistema) {
      alert('No se puede eliminar un módulo del sistema');
      return;
    }

    if (!confirm(`¿Eliminar permanentemente el módulo "${modulo.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.modulosService.eliminarModulo(modulo.id!).subscribe({
      next: () => {
        this.cargarModulos();
        alert('Módulo eliminado exitosamente');
      },
      error: (err) => {
        console.error('❌ Error:', err);
        alert(err.error?.error || 'Error al eliminar el módulo');
      }
    });
  }

  // ============================================
  // EXPORTACIÓN
  // ============================================
  exportarCSV() {
    if (this.modulosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datos = this.modulosFiltrados.map(m => ({
      'Código': m.codigo,
      'Nombre': m.nombre,
      'Ruta': m.ruta || '',
      'Icono': m.icono || '',
      'Padre': m.padre_nombre || 'N/A',
      'Orden': m.orden,
      'Es Sistema': m.es_sistema ? 'Sí' : 'No',
      'Estado': m.activo ? 'Activo' : 'Inactivo'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `modulos_frontend_${fecha}.csv`);
  }

  exportarExcel() {
    if (this.modulosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datos = this.modulosFiltrados.map(m => ({
      'Código': m.codigo,
      'Nombre': m.nombre,
      'Descripción': m.descripcion || '',
      'Ruta': m.ruta || '',
      'Icono': m.icono || '',
      'Módulo Padre': m.padre_nombre || 'N/A',
      'Orden': m.orden,
      'Total Hijos': m.total_hijos || 0,
      'Es Sistema': m.es_sistema ? 'Sí' : 'No',
      'Estado': m.activo ? 'Activo' : 'Inactivo'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Módulos Frontend');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `modulos_frontend_${fecha}.xlsx`);
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