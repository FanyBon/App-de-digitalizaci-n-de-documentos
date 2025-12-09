import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiposPuntoVentaService, TipoPuntoVenta } from '../../../../services/dispositivos/tipos-punto-venta.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-tipos-dispositivos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipos-dispositivos.component.html',
  styleUrls: ['./tipos-dispositivos.component.css']
})
export class TiposDispositivosComponent implements OnInit {
  // Permitir usar Math en el template
  Math = Math;

  // Lista de tipos
  tipos: TipoPuntoVenta[] = [];
  tiposFiltrados: TipoPuntoVenta[] = [];
  tiposPaginados: TipoPuntoVenta[] = [];

  // Estados de carga
  loading: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // Modal
  showModal: boolean = false;
  modoEdicion: boolean = false;

  // Formulario
  tipoForm: Partial<TipoPuntoVenta> = {
    codigo: '',
    nombre: '',
    descripcion: '',
    icono: 'fa-store',
    color: '#6B7280',
    orden: 0,
    categoria: 'operacion',
    requiere_caja: false,
    permite_ventas: true,
    activo: true
  };

  // Búsqueda y filtros
  searchTerm: string = '';
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'activos';
  filtroCategoria: string = 'todas';

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  opcionesPaginacion: number[] = [10, 25, 50, 100, 200];

  // Catálogos
  categorias = [
    { valor: 'venta', nombre: 'Venta', color: 'blue' },
    { valor: 'operacion', nombre: 'Operación', color: 'green' },
    { valor: 'servicio', nombre: 'Servicio', color: 'purple' },
    { valor: 'staff', nombre: 'Staff', color: 'gray' }
  ];

  iconosDisponibles = [
    'fa-cash-register',
    'fa-robot',
    'fa-kitchen-set',
    'fa-clipboard-check',
    'fa-tablet-screen-button',
    'fa-desktop',
    'fa-mobile-alt',
    'fa-laptop',
    'fa-tv',
    'fa-print',
    'fa-barcode',
    'fa-qrcode',
    'fa-credit-card',
    'fa-store'
  ];

  coloresDisponibles = [
    { hex: '#3B82F6', nombre: 'Azul' },
    { hex: '#1e40af', nombre: 'Azul Oscuro' },
    { hex: '#A855F7', nombre: 'Púrpura' },
    { hex: '#F97316', nombre: 'Naranja' },
    { hex: '#10B981', nombre: 'Verde' },
    { hex: '#06B6D4', nombre: 'Cian' },
    { hex: '#6366F1', nombre: 'Índigo' },
    { hex: '#EF4444', nombre: 'Rojo' },
    { hex: '#F59E0B', nombre: 'Amarillo' },
    { hex: '#6B7280', nombre: 'Gris' }
  ];

  constructor(
    private tiposPuntoVentaService: TiposPuntoVentaService
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ========================================
  // CARGA DE DATOS
  // ========================================

  /**
   * Cargar datos iniciales
   */
  cargarDatosIniciales() {
    this.loading = true;
    this.inicioCargaCompleto = false;
    this.error = '';

    this.tiposPuntoVentaService.getTipos(false).subscribe({
      next: (response) => {
        this.tipos = response.data || [];
        this.aplicarFiltros();
        this.loading = false;
        this.inicioCargaCompleto = true;

        console.log('✅ Tipos de dispositivos cargados:', this.tipos.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar tipos:', err);
        this.error = 'Error al cargar los tipos de dispositivos. Por favor, recarga la página.';
        this.loading = false;
        this.inicioCargaCompleto = false;
      }
    });
  }

  /**
   * Recargar tipos
   */
  cargarTipos() {
    this.loading = true;
    this.error = '';

    this.tiposPuntoVentaService.getTipos(false).subscribe({
      next: (response) => {
        this.tipos = response.data;
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Tipos actualizados:', this.tipos.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar tipos:', err);
        this.error = 'Error al cargar los tipos';
        this.loading = false;
      }
    });
  }

  // ========================================
  // FILTROS Y BÚSQUEDA
  // ========================================

  /**
   * Aplicar filtros y búsqueda
   */
  aplicarFiltros() {
    let resultado = [...this.tipos];

    // Filtro por estado
    if (this.filtroActivo === 'activos') {
      resultado = resultado.filter(t => t.activo);
    } else if (this.filtroActivo === 'inactivos') {
      resultado = resultado.filter(t => !t.activo);
    }

    // Filtro por categoría
    if (this.filtroCategoria !== 'todas') {
      resultado = resultado.filter(t => t.categoria === this.filtroCategoria);
    }

    // Búsqueda por texto
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(t =>
        t.nombre.toLowerCase().includes(term) ||
        t.codigo.toLowerCase().includes(term) ||
        t.descripcion?.toLowerCase().includes(term)
      );
    }

    this.tiposFiltrados = resultado;
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
   * Cambiar filtro de categoría
   */
  cambiarFiltroCategoria(categoria: string) {
    this.filtroCategoria = categoria;
    this.aplicarFiltros();
  }

  /**
   * Búsqueda en tiempo real
   */
  onSearchChange() {
    this.aplicarFiltros();
  }

  // ========================================
  // PAGINACIÓN
  // ========================================

  /**
   * Calcular paginación
   */
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.tiposFiltrados.length / this.itemsPorPagina);

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
    this.tiposPaginados = this.tiposFiltrados.slice(inicio, fin);
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
  // EXPORTACIÓN
  // ========================================

  /**
   * Exportar a CSV
   */
  exportarCSV() {
    if (this.tiposFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosCSV = this.tiposFiltrados.map(t => ({
      'Código': t.codigo,
      'Nombre': t.nombre,
      'Descripción': t.descripcion || '',
      'Categoría': t.categoria || '',
      'Requiere Caja': t.requiere_caja ? 'Sí' : 'No',
      'Permite Ventas': t.permite_ventas ? 'Sí' : 'No',
      'Estado': t.activo ? 'Activo' : 'Inactivo',
      'Orden': t.orden || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosCSV);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `tipos_dispositivos_${fecha}.csv`);

    console.log('✅ CSV exportado:', datosCSV.length, 'registros');
  }

  /**
   * Exportar a Excel
   */
  exportarExcel() {
    if (this.tiposFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosExcel = this.tiposFiltrados.map(t => ({
      'Código': t.codigo,
      'Nombre': t.nombre,
      'Descripción': t.descripcion || '',
      'Ícono': t.icono || '',
      'Color': t.color || '',
      'Orden': t.orden || 0,
      'Categoría': t.categoria || '',
      'Requiere Caja': t.requiere_caja ? 'Sí' : 'No',
      'Permite Ventas': t.permite_ventas ? 'Sí' : 'No',
      'Estado': t.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
      'Fecha Actualización': t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tipos');

    const maxWidth = 30;
    const columnWidths = Object.keys(datosExcel[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }));
    worksheet['!cols'] = columnWidths;

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `tipos_dispositivos_${fecha}.xlsx`);

    console.log('✅ Excel exportado:', datosExcel.length, 'registros');
  }

  // ========================================
  // MODAL Y CRUD
  // ========================================

  /**
   * Abrir modal para nuevo tipo
   */
  abrirModalNuevo() {
    this.modoEdicion = false;
    this.tipoForm = {
      codigo: '',
      nombre: '',
      descripcion: '',
      icono: 'fa-store',
      color: '#6B7280',
      orden: 0,
      categoria: 'operacion',
      requiere_caja: false,
      permite_ventas: true,
      activo: true
    };
    this.showModal = true;
  }

  /**
   * Abrir modal para editar
   */
  abrirModalEditar(tipo: TipoPuntoVenta) {
    this.modoEdicion = true;
    this.tipoForm = { ...tipo };
    this.showModal = true;
  }

  /**
   * Cerrar modal
   */
  cerrarModal() {
    this.showModal = false;
    this.tipoForm = {
      codigo: '',
      nombre: '',
      descripcion: '',
      icono: 'fa-store',
      color: '#6B7280',
      orden: 0,
      categoria: 'operacion',
      requiere_caja: false,
      permite_ventas: true,
      activo: true
    };
  }

  /**
   * Guardar tipo
   */
  guardarTipo() {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;

    const datosEnviar = {
      codigo: this.tipoForm.codigo,
      nombre: this.tipoForm.nombre,
      descripcion: this.tipoForm.descripcion,
      icono: this.tipoForm.icono,
      color: this.tipoForm.color,
      orden: this.tipoForm.orden,
      categoria: this.tipoForm.categoria,
      requiere_caja: this.tipoForm.requiere_caja,
      permite_ventas: this.tipoForm.permite_ventas,
      activo: this.tipoForm.activo
    };

    console.log('📤 Enviando datos:', datosEnviar);

    if (this.modoEdicion && this.tipoForm.id) {
      // Actualizar
      this.tiposPuntoVentaService.updateTipo(this.tipoForm.id, datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Tipo actualizado:', response);
            this.cargarTipos();
            this.cerrarModal();
            alert('Tipo de dispositivo actualizado exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al actualizar:', err);
            alert(err.error?.error || 'Error al actualizar el tipo');
            this.loading = false;
          }
        });
    } else {
      // Crear
      this.tiposPuntoVentaService.createTipo(datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Tipo creado:', response);
            this.cargarTipos();
            this.cerrarModal();
            alert('Tipo de dispositivo creado exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al crear:', err);
            alert(err.error?.error || 'Error al crear el tipo');
            this.loading = false;
          }
        });
    }
  }

  /**
   * Validar formulario
   */
  validarFormulario(): boolean {
    if (!this.tipoForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!this.tipoForm.codigo?.trim()) {
      alert('El código es obligatorio');
      return false;
    }
    if (!this.tipoForm.icono?.trim()) {
      alert('Debes seleccionar un ícono');
      return false;
    }
    if (!this.tipoForm.color?.trim()) {
      alert('Debes seleccionar un color');
      return false;
    }
    return true;
  }

  /**
   * Desactivar tipo
   */
  desactivarTipo(tipo: TipoPuntoVenta) {
    if (!confirm(`¿Desactivar el tipo "${tipo.nombre}"?\n\nNota: No podrás desactivar si hay dispositivos activos usando este tipo.`)) {
      return;
    }

    this.loading = true;

    // Como no tenemos el método en el servicio, lo agregamos
    this.tiposPuntoVentaService.updateTipo(tipo.id, { activo: false })
      .subscribe({
        next: () => {
          console.log('✅ Tipo desactivado');
          this.cargarTipos();
          alert('Tipo desactivado exitosamente');
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error al desactivar:', err);
          alert(err.error?.error || 'Error al desactivar el tipo');
          this.loading = false;
        }
      });
  }

  /**
   * Reactivar tipo
   */
  reactivarTipo(tipo: TipoPuntoVenta) {
    if (!confirm(`¿Reactivar el tipo "${tipo.nombre}"?`)) {
      return;
    }

    this.loading = true;

    this.tiposPuntoVentaService.updateTipo(tipo.id, { activo: true })
      .subscribe({
        next: () => {
          console.log('✅ Tipo reactivado');
          this.cargarTipos();
          alert('Tipo reactivado exitosamente');
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error al reactivar:', err);
          alert(err.error?.error || 'Error al reactivar el tipo');
          this.loading = false;
        }
      });
  }

  // ========================================
  // HELPERS
  // ========================================

  /**
   * Obtener clase de color por categoría
   */
  getColorCategoria(categoria?: string): string {
    const colores: Record<string, string> = {
      'venta': 'text-blue-600',
      'operacion': 'text-green-600',
      'servicio': 'text-purple-600',
      'staff': 'text-gray-600'
    };
    return colores[categoria || 'operacion'] || 'text-gray-600';
  }

  /**
   * Obtener badge de categoría
   */
  getBadgeCategoria(categoria?: string): string {
    const badges: Record<string, string> = {
      'venta': 'bg-blue-100 text-blue-800',
      'operacion': 'bg-green-100 text-green-800',
      'servicio': 'bg-purple-100 text-purple-800',
      'staff': 'bg-gray-100 text-gray-800'
    };
    return badges[categoria || 'operacion'] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Obtener nombre de categoría
   */
  getNombreCategoria(categoria?: string): string {
    const nombres: Record<string, string> = {
      'venta': 'Venta',
      'operacion': 'Operación',
      'servicio': 'Servicio',
      'staff': 'Staff'
    };
    return nombres[categoria || 'operacion'] || categoria || 'N/A';
  }
}