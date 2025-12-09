import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresasService, Empresa } from '../../../../services/empresas/empresas.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lista-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-empresas.component.html',
  styleUrls: ['./lista-empresas.component.css']
})
export class ListaEmpresasComponent implements OnInit {
  Math = Math;

  // Datos
  empresas: Empresa[] = [];
  empresasFiltradas: Empresa[] = [];
  empresasPaginadas: Empresa[] = [];
  
  // Lista de empresas padre (para el select)
  empresasPadre: Empresa[] = [];
  empresasPadreFiltradas: Empresa[] = [];
  searchEmpresaPadre: string = '';
  empresaPadreSeleccionada: Empresa | null = null;
  mostrarDropdownPadre: boolean = false;

  // Estados de carga
  loading: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // Modal
  showModal: boolean = false;
  modoEdicion: boolean = false;

  // Formulario
  empresaForm: Partial<Empresa> = {
    parent_id: null,
    nombre: '',
    contacto: '',
    telefono: '',
    costo_charola: 0,
    estimado_personas: 0,
    estatus: 'activo'
  };

  // Búsqueda y filtros
  searchTerm: string = '';
  filtroEstatus: 'todos' | 'activo' | 'inactivo' | 'suspendido' = 'activo';

  // Vista
  vistaActual: 'tabla' | 'tarjetas' = 'tabla';

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  opcionesPaginacion: number[] = [10, 25, 50, 100, 200];

  constructor(private empresasService: EmpresasService) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    this.loading = true;
    this.inicioCargaCompleto = false;
    this.error = '';

    this.empresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        
        // Filtrar solo empresas padre (sin parent_id) para el select
        this.empresasPadre = empresas.filter(e => !e.parent_id && e.estatus === 'activo');
        this.empresasPadreFiltradas = [...this.empresasPadre];
        
        this.aplicarFiltros();
        this.loading = false;
        this.inicioCargaCompleto = true;
        console.log('✅ Empresas cargadas:', this.empresas.length);
        console.log('✅ Empresas padre disponibles:', this.empresasPadre.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar empresas:', err);
        this.error = 'Error al cargar las empresas. Por favor, recarga la página.';
        this.loading = false;
        this.inicioCargaCompleto = false;
      }
    });
  }

  cargarEmpresas() {
    this.loading = true;
    this.error = '';

    this.empresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        
        // Actualizar lista de empresas padre
        this.empresasPadre = empresas.filter(e => !e.parent_id && e.estatus === 'activo');
        this.empresasPadreFiltradas = [...this.empresasPadre];
        
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Empresas actualizadas:', this.empresas.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar empresas:', err);
        this.error = 'Error al cargar las empresas';
        this.loading = false;
      }
    });
  }

  aplicarFiltros() {
    let resultado = [...this.empresas];

    if (this.filtroEstatus !== 'todos') {
      resultado = resultado.filter(e => e.estatus === this.filtroEstatus);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(term) ||
        e.contacto.toLowerCase().includes(term) ||
        e.telefono.toLowerCase().includes(term)
      );
    }

    this.empresasFiltradas = resultado;
    this.calcularPaginacion();
  }

  cambiarFiltro(filtro: 'todos' | 'activo' | 'inactivo' | 'suspendido') {
    this.filtroEstatus = filtro;
    this.aplicarFiltros();
  }

  onSearchChange() {
    this.aplicarFiltros();
  }

  /**
   * Cambiar vista entre tabla y tarjetas
   */
  cambiarVista(vista: 'tabla' | 'tarjetas') {
    this.vistaActual = vista;
    console.log('🔄 Vista cambiada a:', vista);
  }

  /**
   * Filtrar empresas padre en el select
   */
  filtrarEmpresasPadre() {
    if (!this.searchEmpresaPadre.trim()) {
      this.empresasPadreFiltradas = [...this.empresasPadre];
    } else {
      const term = this.searchEmpresaPadre.toLowerCase();
      this.empresasPadreFiltradas = this.empresasPadre.filter(e =>
        e.nombre.toLowerCase().includes(term) ||
        e.contacto.toLowerCase().includes(term)
      );
    }
  }

  /**
   * Seleccionar empresa padre
   */
  seleccionarEmpresaPadre(empresa: Empresa) {
    this.empresaPadreSeleccionada = empresa;
    this.empresaForm.parent_id = empresa.id;
    this.searchEmpresaPadre = '';
    this.mostrarDropdownPadre = false;
    console.log('✅ Empresa padre seleccionada:', empresa.nombre);
  }

  /**
   * Limpiar empresa padre
   */
  limpiarEmpresaPadre() {
    this.empresaPadreSeleccionada = null;
    this.empresaForm.parent_id = null;
    this.searchEmpresaPadre = '';
    this.mostrarDropdownPadre = false;
    this.empresasPadreFiltradas = [...this.empresasPadre];
  }

  /**
   * Cambiar empresa padre
   */
  cambiarEmpresaPadre() {
    this.empresaPadreSeleccionada = null;
    this.empresaForm.parent_id = null;
    this.searchEmpresaPadre = '';
    this.mostrarDropdownPadre = true;
    this.empresasPadreFiltradas = [...this.empresasPadre];
  }

  /**
   * Cerrar dropdown al hacer click fuera
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-empresas-padre')) {
      this.mostrarDropdownPadre = false;
    }
  }

  /**
   * Indicar si la empresa es hija
   */
  esEmpresaHija(empresa: Empresa): boolean {
    return !!empresa.parent_id;
  }

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.empresasFiltradas.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }
    this.actualizarPaginaActual();
  }

  actualizarPaginaActual() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.empresasPaginadas = this.empresasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPaginaActual();
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

  exportarCSV() {
    if (this.empresasFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosCSV = this.empresasFiltradas.map(e => ({
      'Nombre': e.nombre,
      'Empresa Padre': e.parent_nombre || 'N/A',
      'Contacto': e.contacto,
      'Teléfono': e.telefono,
      'Costo Charola': e.costo_charola || 0,
      'Estimado Personas': e.estimado_personas || 0,
      'Ubicaciones': e.total_ubicaciones || 0,
      'Puntos Venta': e.total_puntos_venta || 0,
      'Estado': e.estatus,
      'Fecha Creación': e.created_at ? new Date(e.created_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosCSV);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `empresas_${fecha}.csv`);

    console.log('✅ CSV exportado:', datosCSV.length, 'registros');
  }

  exportarExcel() {
    if (this.empresasFiltradas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosExcel = this.empresasFiltradas.map(e => ({
      'Nombre': e.nombre,
      'Empresa Padre': e.parent_nombre || 'N/A',
      'Contacto': e.contacto,
      'Teléfono': e.telefono,
      'Costo Charola': e.costo_charola || 0,
      'Estimado Personas': e.estimado_personas || 0,
      'Total Ubicaciones': e.total_ubicaciones || 0,
      'Total Puntos Venta': e.total_puntos_venta || 0,
      'Estado': e.estatus,
      'Fecha Creación': e.created_at ? new Date(e.created_at).toLocaleDateString() : '',
      'Fecha Actualización': e.updated_at ? new Date(e.updated_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');

    const maxWidth = 30;
    const columnWidths = Object.keys(datosExcel[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }));
    worksheet['!cols'] = columnWidths;

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `empresas_${fecha}.xlsx`);

    console.log('✅ Excel exportado:', datosExcel.length, 'registros');
  }

  abrirModalNuevo() {
    this.modoEdicion = false;
    this.empresaForm = {
      parent_id: null,
      nombre: '',
      contacto: '',
      telefono: '',
      costo_charola: 0,
      estimado_personas: 0,
      estatus: 'activo'
    };
    this.empresaPadreSeleccionada = null;
    this.searchEmpresaPadre = '';
    this.empresasPadreFiltradas = [...this.empresasPadre];
    this.showModal = true;
  }

  abrirModalEditar(empresa: Empresa) {
    this.modoEdicion = true;
    this.empresaForm = { ...empresa };

    // Cargar empresa padre si existe
    if (empresa.parent_id) {
      const padre = this.empresasPadre.find(e => e.id === empresa.parent_id);
      this.empresaPadreSeleccionada = padre || null;
    } else {
      this.empresaPadreSeleccionada = null;
    }
    
    this.searchEmpresaPadre = '';
    this.empresasPadreFiltradas = [...this.empresasPadre];
    
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.empresaForm = {
      parent_id: null,
      nombre: '',
      contacto: '',
      telefono: '',
      costo_charola: 0,
      estimado_personas: 0,
      estatus: 'activo'
    };
    this.empresaPadreSeleccionada = null;
    this.searchEmpresaPadre = '';
  }

  guardarEmpresa() {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;

    const datosEnviar = {
      parent_id: this.empresaForm.parent_id || null,
      nombre: this.empresaForm.nombre,
      contacto: this.empresaForm.contacto,
      telefono: this.empresaForm.telefono,
      costo_charola: this.empresaForm.costo_charola || 0,
      estimado_personas: this.empresaForm.estimado_personas || 0,
      estatus: this.empresaForm.estatus || 'activo'
    };

    console.log('📤 Enviando datos:', datosEnviar);

    if (this.modoEdicion && this.empresaForm.id) {
      this.empresasService.editarEmpresa(this.empresaForm.id, datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Empresa actualizada:', response);
            this.cargarEmpresas();
            this.cerrarModal();
            alert('Empresa actualizada exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al actualizar:', err);
            alert(err.error?.error || 'Error al actualizar la empresa');
            this.loading = false;
          }
        });
    } else {
      this.empresasService.crearEmpresa(datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Empresa creada:', response);
            this.cargarEmpresas();
            this.cerrarModal();
            alert('Empresa creada exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al crear:', err);
            alert(err.error?.error || 'Error al crear la empresa');
            this.loading = false;
          }
        });
    }
  }

  validarFormulario(): boolean {
    if (!this.empresaForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!this.empresaForm.contacto?.trim()) {
      alert('El contacto es obligatorio');
      return false;
    }
    if (!this.empresaForm.telefono?.trim()) {
      alert('El teléfono es obligatorio');
      return false;
    }
    return true;
  }

  cambiarEstatus(empresa: Empresa, nuevoEstatus: 'activo' | 'inactivo' | 'suspendido') {
    const mensajes = {
      'activo': '¿Activar',
      'inactivo': '¿Inactivar',
      'suspendido': '¿Suspender'
    };

    if (!confirm(`${mensajes[nuevoEstatus]} la empresa "${empresa.nombre}"?`)) {
      return;
    }

    this.loading = true;

    this.empresasService.cambiarEstatus(empresa.id, nuevoEstatus)
      .subscribe({
        next: () => {
          console.log('✅ Estatus cambiado');
          this.cargarEmpresas();
          alert(`Empresa ${nuevoEstatus === 'activo' ? 'activada' : nuevoEstatus === 'inactivo' ? 'inactivada' : 'suspendida'} exitosamente`);
        },
        error: (err) => {
          console.error('❌ Error al cambiar estatus:', err);
          alert(err.error?.error || 'Error al cambiar el estatus');
          this.loading = false;
        }
      });
  }

  eliminarPermanente(empresa: Empresa) {
    const mensaje = `⚠️ ADVERTENCIA: ELIMINACIÓN PERMANENTE
    
Estás a punto de ELIMINAR PERMANENTEMENTE:
- Empresa: ${empresa.nombre}

Esta acción:
✗ NO se puede deshacer
✗ Eliminará todos los datos relacionados

¿Estás completamente seguro?`;

    if (!confirm(mensaje)) {
      return;
    }

    const confirmarNombre = prompt(
      `Para confirmar, escribe el nombre de la empresa: "${empresa.nombre}"`
    );

    if (confirmarNombre !== empresa.nombre) {
      alert('El nombre no coincide. Eliminación cancelada.');
      return;
    }

    this.loading = true;

    this.empresasService.eliminarEmpresa(empresa.id)
      .subscribe({
        next: () => {
          console.log('✅ Empresa eliminada permanentemente');
          this.cargarEmpresas();
          alert('Empresa eliminada permanentemente');
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error al eliminar:', err);
          alert(err.error?.error || 'Error al eliminar la empresa');
          this.loading = false;
        }
      });
  }

  getBadgeEstatus(estatus: string): string {
    const badges: Record<string, string> = {
      'activo': 'bg-green-100 text-green-800',
      'inactivo': 'bg-red-100 text-red-800',
      'suspendido': 'bg-yellow-100 text-yellow-800'
    };
    return badges[estatus] || 'bg-gray-100 text-gray-800';
  }
}