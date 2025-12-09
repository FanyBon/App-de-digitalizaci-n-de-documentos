import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UbicacionesService, Ubicacion } from '../../../../services/empresas/ubicaciones.service';
import { EmpresasService, Empresa } from '../../../../services/empresas/empresas.service';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lista-ubicaciones',  // ⭐ CORREGIDO
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-ubicaciones.component.html',  // ⭐ CORREGIDO
  styleUrls: ['./lista-ubicaciones.component.css']
})
export class ListaUbicacionesComponent implements OnInit {  // ⭐ CORREGIDO
  // Permitir usar Math en el template
  Math = Math;

  // Lista de ubicaciones
  ubicaciones: Ubicacion[] = [];
  ubicacionesFiltradas: Ubicacion[] = [];
  ubicacionesPaginadas: Ubicacion[] = [];

  // Lista de empresas
  empresas: Empresa[] = [];
  empresasFiltradas: Empresa[] = [];

  // Estados de carga
  loading: boolean = false;
  loadingEmpresas: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // Modal
  showModal: boolean = false;
  modoEdicion: boolean = false;

  // Formulario
  ubicacionForm: Partial<Ubicacion> = {
    empresa_id: 0,
    nombre: '',
    codigo: '',
    direccion: '',
    telefono: '',
    activo: true
  };

  // Búsqueda en empresas (para el select)
  searchEmpresa: string = '';
  empresaSeleccionada: Empresa | null = null;

  // Búsqueda y filtros de ubicaciones
  searchTerm: string = '';
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'activos';
  mostrarDropdownEmpresas: boolean = false;

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  opcionesPaginacion: number[] = [10, 25, 50, 100, 200];

  constructor(
    private ubicacionesService: UbicacionesService,
    private empresasService: EmpresasService
  ) { }

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  /**
   * Cargar datos iniciales (ubicaciones + empresas)
   */
  cargarDatosIniciales() {
    this.loading = true;
    this.inicioCargaCompleto = false;
    this.error = '';

    forkJoin({
      ubicaciones: this.ubicacionesService.getUbicaciones(),
      empresas: this.empresasService.listarEmpresas()
    }).subscribe({
      next: (resultado) => {
        this.ubicaciones = resultado.ubicaciones.data || [];
        this.aplicarFiltros();

        this.empresas = resultado.empresas.filter(e => e.estatus === 'activo');
        this.empresasFiltradas = [...this.empresas];

        this.loading = false;
        this.inicioCargaCompleto = true;

        console.log('✅ Datos iniciales cargados:', {
          ubicaciones: this.ubicaciones.length,
          empresas: this.empresas.length
        });
      },
      error: (err) => {
        console.error('❌ Error al cargar datos iniciales:', err);
        this.error = 'Error al cargar los datos. Por favor, recarga la página.';
        this.loading = false;
        this.inicioCargaCompleto = false;
      }
    });
  }

  /**
   * Cargar solo ubicaciones (para refresh)
   */
  cargarUbicaciones() {
    this.loading = true;
    this.error = '';

    this.ubicacionesService.getUbicaciones().subscribe({
      next: (response) => {
        this.ubicaciones = response.data;
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Ubicaciones actualizadas:', this.ubicaciones.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar ubicaciones:', err);
        this.error = 'Error al cargar las ubicaciones';
        this.loading = false;
      }
    });
  }

  /**
   * Aplicar filtros y búsqueda
   */
  aplicarFiltros() {
    let resultado = [...this.ubicaciones];

    if (this.filtroActivo === 'activos') {
      resultado = resultado.filter(u => u.activo);
    } else if (this.filtroActivo === 'inactivos') {
      resultado = resultado.filter(u => !u.activo);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(u =>
        u.nombre.toLowerCase().includes(term) ||
        u.codigo.toLowerCase().includes(term) ||
        u.empresa_nombre?.toLowerCase().includes(term)
      );
    }

    this.ubicacionesFiltradas = resultado;
    this.calcularPaginacion();
  }

  /**
   * Cambiar filtro de estado
   */
  cambiarFiltro(filtro: 'todos' | 'activos' | 'inactivos') {
    this.filtroActivo = filtro;
    this.aplicarFiltros();
  }

  /**
   * Búsqueda en tiempo real
   */
  onSearchChange() {
    this.aplicarFiltros();
  }

  // ========================================
  // MÉTODOS DE PAGINACIÓN
  // ========================================

  /**
   * Calcular paginación
   */
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.ubicacionesFiltradas.length / this.itemsPorPagina);

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }

    this.actualizarPaginaActual();
  }

  /**
   * Actualizar datos de la página actual
   */
  actualizarPaginaActual() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.ubicacionesPaginadas = this.ubicacionesFiltradas.slice(inicio, fin);
  }

  /**
   * Cambiar página
   */
  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPaginaActual();
    }
  }

  /**
   * Cambiar items por página
   */
  cambiarItemsPorPagina(items: number) {
    this.itemsPorPagina = items;
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  /**
   * Obtener array de páginas para mostrar
   */
  getPaginas(): number[] {
    const paginas: number[] = [];
    const maxPaginasVisibles = 5;

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

  // ========================================
  // MÉTODOS DE EXPORTACIÓN
  // ========================================

  /**
   * Exportar a CSV
   */
  exportarCSV() {
    if (this.ubicacionesFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosCSV = this.ubicacionesFiltradas.map(u => ({
      'Código': u.codigo,
      'Nombre': u.nombre,
      'Empresa': u.empresa_nombre || '',
      'Dirección': u.direccion || '',
      'Teléfono': u.telefono || '',
      'Estado': u.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosCSV);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `ubicaciones_${fecha}.csv`);

    console.log('✅ CSV exportado:', datosCSV.length, 'registros');
  }

  /**
   * Exportar a Excel
   */
  exportarExcel() {
    if (this.ubicacionesFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosExcel = this.ubicacionesFiltradas.map(u => ({
      'Código': u.codigo,
      'Nombre': u.nombre,
      'Empresa': u.empresa_nombre || '',
      'Dirección': u.direccion || '',
      'Teléfono': u.telefono || '',
      'Estado': u.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      'Fecha Actualización': u.updated_at ? new Date(u.updated_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ubicaciones');

    const maxWidth = 30;
    const columnWidths = Object.keys(datosExcel[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }));
    worksheet['!cols'] = columnWidths;

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ubicaciones_${fecha}.xlsx`);

    console.log('✅ Excel exportado:', datosExcel.length, 'registros');
  }

  // ========================================
  // MÉTODOS DE EMPRESAS
  // ========================================

  /**
   * Filtrar empresas en el select
   */
  filtrarEmpresas() {
    if (!this.searchEmpresa.trim()) {
      this.empresasFiltradas = [...this.empresas];
    } else {
      const term = this.searchEmpresa.toLowerCase();
      this.empresasFiltradas = this.empresas.filter(e =>
        e.nombre.toLowerCase().includes(term) ||
        e.contacto.toLowerCase().includes(term)
      );
    }
  }

  /**
   * Abrir/cerrar dropdown de empresas
   */
  toggleDropdownEmpresas() {
    this.mostrarDropdownEmpresas = !this.mostrarDropdownEmpresas;
  }

  /**
   * Seleccionar empresa
   */
  seleccionarEmpresa(empresa: Empresa) {
    this.empresaSeleccionada = empresa;
    this.ubicacionForm.empresa_id = empresa.id;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresas = false;
    console.log('✅ Empresa seleccionada:', empresa.nombre);
  }

  /**
   * Cerrar dropdown al hacer click fuera
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-empresas')) {
      this.mostrarDropdownEmpresas = false;
    }
  }

  /**
   * Limpiar selección de empresa
   */
  limpiarEmpresa() {
    this.empresaSeleccionada = null;
    this.ubicacionForm.empresa_id = 0;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresas = false;
    this.empresasFiltradas = [...this.empresas];
  }

  /**
   * Cambiar empresa seleccionada
   */
  cambiarEmpresa() {
    this.empresaSeleccionada = null;
    this.ubicacionForm.empresa_id = 0;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresas = true;
    this.empresasFiltradas = [...this.empresas];
  }

  // ========================================
  // MÉTODOS DE MODAL Y CRUD
  // ========================================

  /**
   * Abrir modal para nueva ubicación
   */
  abrirModalNuevo() {
    this.modoEdicion = false;
    this.ubicacionForm = {
      empresa_id: 0,
      nombre: '',
      codigo: '',
      direccion: '',
      telefono: '',
      activo: true
    };
    this.empresaSeleccionada = null;
    this.searchEmpresa = '';
    this.empresasFiltradas = [...this.empresas];
    this.showModal = true;
  }

  /**
   * Abrir modal para editar
   */
  abrirModalEditar(ubicacion: Ubicacion) {
    this.modoEdicion = true;
    this.ubicacionForm = { ...ubicacion };

    const empresa = this.empresas.find(e => e.id === ubicacion.empresa_id);
    this.empresaSeleccionada = empresa || null;
    this.searchEmpresa = '';
    this.empresasFiltradas = [...this.empresas];

    this.showModal = true;
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    this.showModal = false;
    this.ubicacionForm = {
      empresa_id: 0,
      nombre: '',
      codigo: '',
      direccion: '',
      telefono: '',
      activo: true
    };
    this.empresaSeleccionada = null;
    this.searchEmpresa = '';
  }

  /**
   * Guardar ubicación
   */
  guardarUbicacion() {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;

    const datosEnviar = {
      empresa_id: this.ubicacionForm.empresa_id,
      nombre: this.ubicacionForm.nombre,
      codigo: this.ubicacionForm.codigo,
      direccion: this.ubicacionForm.direccion || '',
      telefono: this.ubicacionForm.telefono || '',
      activo: this.ubicacionForm.activo
    };

    console.log('📤 Enviando datos:', datosEnviar);

    if (this.modoEdicion && this.ubicacionForm.id) {
      this.ubicacionesService.updateUbicacion(this.ubicacionForm.id, datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Ubicación actualizada:', response);
            this.cargarUbicaciones();
            this.cerrarModal();
            alert('Ubicación actualizada exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al actualizar:', err);
            alert(err.error?.error || 'Error al actualizar la ubicación');
            this.loading = false;
          }
        });
    } else {
      this.ubicacionesService.createUbicacion(datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Ubicación creada:', response);
            this.cargarUbicaciones();
            this.cerrarModal();
            alert('Ubicación creada exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al crear:', err);
            alert(err.error?.error || 'Error al crear la ubicación');
            this.loading = false;
          }
        });
    }
  }

  /**
   * Validar formulario
   */
  validarFormulario(): boolean {
    if (!this.ubicacionForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!this.ubicacionForm.codigo?.trim()) {
      alert('El código es obligatorio');
      return false;
    }
    if (!this.ubicacionForm.empresa_id || this.ubicacionForm.empresa_id === 0) {
      alert('Debes seleccionar una empresa');
      return false;
    }
    return true;
  }

  /**
   * Desactivar ubicación
   */
  desactivarUbicacion(ubicacion: Ubicacion) {
    if (!confirm(`¿Desactivar la ubicación "${ubicacion.nombre}"?`)) {
      return;
    }

    this.ubicacionesService.desactivarUbicacion(ubicacion.id!)
      .subscribe({
        next: () => {
          console.log('✅ Ubicación desactivada');
          this.cargarUbicaciones();
          alert('Ubicación desactivada exitosamente');
        },
        error: (err) => {
          console.error('❌ Error al desactivar:', err);
          alert(err.error?.error || 'Error al desactivar la ubicación');
        }
      });
  }

  /**
   * Reactivar ubicación
   */
  reactivarUbicacion(ubicacion: Ubicacion) {
    if (!confirm(`¿Reactivar la ubicación "${ubicacion.nombre}"?`)) {
      return;
    }

    this.ubicacionesService.reactivarUbicacion(ubicacion.id!)
      .subscribe({
        next: () => {
          console.log('✅ Ubicación reactivada');
          this.cargarUbicaciones();
          alert('Ubicación reactivada exitosamente');
        },
        error: (err) => {
          console.error('❌ Error al reactivar:', err);
          alert(err.error?.error || 'Error al reactivar la ubicación');
        }
      });
  }

  /**
   * Eliminar permanentemente
   */
  eliminarPermanente(ubicacion: Ubicacion) {
    const mensaje = `⚠️ ADVERTENCIA: ELIMINACIÓN PERMANENTE
    
Estás a punto de ELIMINAR PERMANENTEMENTE:
- Ubicación: ${ubicacion.nombre}
- Código: ${ubicacion.codigo}

Esta acción:
✗ NO se puede deshacer
✗ Eliminará todos los datos relacionados

¿Estás completamente seguro?`;

    if (!confirm(mensaje)) {
      return;
    }

    const confirmarNombre = prompt(
      `Para confirmar, escribe el nombre de la ubicación: "${ubicacion.nombre}"`
    );

    if (confirmarNombre !== ubicacion.nombre) {
      alert('El nombre no coincide. Eliminación cancelada.');
      return;
    }

    this.loading = true;

    this.ubicacionesService.eliminarPermanente(ubicacion.id!)
      .subscribe({
        next: () => {
          console.log('✅ Ubicación eliminada permanentemente');
          this.cargarUbicaciones();
          alert('✅ Ubicación eliminada permanentemente');
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error al eliminar:', err);
          alert(err.error?.error || 'Error al eliminar la ubicación');
          this.loading = false;
        }
      });
  }
}