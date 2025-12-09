import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PuntosVentaService, PuntoVenta } from '../../../../services/dispositivos/puntos-venta.service';
import { TiposPuntoVentaService, TipoPuntoVenta } from '../../../../services/dispositivos/tipos-punto-venta.service';
import { UbicacionesService, Ubicacion } from '../../../../services/empresas/ubicaciones.service';
import { EmpresasService, Empresa } from '../../../../services/empresas/empresas.service';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lista-dispositivos',  // ⭐ CAMBIA EL SELECTOR
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-dispositivos.component.html',
  styleUrls: ['./lista-dispositivos.component.css']
})
export class ListaDispositivosComponent implements OnInit {  // ⭐ CAMBIA EL NOMBRE DE LA CLASE

  // ========================================
  // TODO EL CÓDIGO QUE YA TIENES
  // ========================================
  
  Math = Math;

  // Datos
  dispositivos: PuntoVenta[] = [];
  dispositivosFiltrados: PuntoVenta[] = [];
  dispositivosPaginados: PuntoVenta[] = [];

  ubicaciones: Ubicacion[] = [];
  ubicacionesFiltradas: Ubicacion[] = [];

  empresas: Empresa[] = [];
  tiposDispositivo: TipoPuntoVenta[] = [];
  tiposDispositivoFiltrados: TipoPuntoVenta[] = [];

  // Estados de carga
  loading: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // Modal
  showModal: boolean = false;
  modoEdicion: boolean = false;

  // Formulario
  dispositivoForm: Partial<PuntoVenta> = {
    empresa_id: 0,
    ubicacion_id: 0,
    tipo_id: 0,
    codigo: '',
    nombre: '',
    activo: true
  };

  // Selección en cascada
  empresaSeleccionada: Empresa | null = null;
  ubicacionSeleccionada: Ubicacion | null = null;
  tipoSeleccionado: TipoPuntoVenta | null = null;

  // Búsquedas en selectores
  searchEmpresa: string = '';
  searchUbicacion: string = '';
  searchTipo: string = '';

  // Dropdowns
  mostrarDropdownEmpresas: boolean = false;
  mostrarDropdownUbicaciones: boolean = false;
  mostrarDropdownTipos: boolean = false;

  // Búsqueda y filtros
  searchTerm: string = '';
  filtroActivo: 'todos' | 'activos' | 'inactivos' = 'activos';
  filtroTipo: number = 0;
  filtroUbicacion: number = 0;

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  opcionesPaginacion: number[] = [10, 25, 50, 100, 200];

  constructor(
    private puntosVentaService: PuntosVentaService,
    private tiposPuntoVentaService: TiposPuntoVentaService,
    private ubicacionesService: UbicacionesService,
    private empresasService: EmpresasService
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  // ========================================
  // AQUÍ VA TODO TU CÓDIGO ACTUAL
  // ========================================
  
  /**
   * Cargar datos iniciales en paralelo
   */
  cargarDatosIniciales() {
    this.loading = true;
    this.inicioCargaCompleto = false;
    this.error = '';

    forkJoin({
      dispositivos: this.puntosVentaService.getPuntosVenta(),
      ubicaciones: this.ubicacionesService.getUbicaciones(),
      empresas: this.empresasService.listarEmpresas(),
      tipos: this.tiposPuntoVentaService.getTipos(true)
    }).subscribe({
      next: (resultado) => {
        this.dispositivos = resultado.dispositivos.data || [];
        this.ubicaciones = resultado.ubicaciones.data.filter(u => u.activo) || [];
        this.empresas = resultado.empresas.filter(e => e.estatus === 'activo') || [];
        this.tiposDispositivo = resultado.tipos.data || [];

        this.ubicacionesFiltradas = [...this.ubicaciones];
        this.tiposDispositivoFiltrados = [...this.tiposDispositivo];

        this.aplicarFiltros();
        this.loading = false;
        this.inicioCargaCompleto = true;

        console.log('✅ Datos cargados:', {
          dispositivos: this.dispositivos.length,
          ubicaciones: this.ubicaciones.length,
          empresas: this.empresas.length,
          tipos: this.tiposDispositivo.length
        });
      },
      error: (err) => {
        console.error('❌ Error al cargar datos:', err);
        this.error = 'Error al cargar los datos. Por favor, recarga la página.';
        this.loading = false;
        this.inicioCargaCompleto = false;
      }
    });
  }

  /**
   * Recargar solo dispositivos
   */
  cargarDispositivos() {
    this.loading = true;
    this.error = '';

    this.puntosVentaService.getPuntosVenta().subscribe({
      next: (response) => {
        this.dispositivos = response.data;
        this.aplicarFiltros();
        this.loading = false;
        console.log('✅ Dispositivos actualizados:', this.dispositivos.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar dispositivos:', err);
        this.error = 'Error al cargar los dispositivos';
        this.loading = false;
      }
    });
  }

  // ... AQUÍ COPIAS TODOS LOS DEMÁS MÉTODOS QUE YA TIENES:
  // - aplicarFiltros()
  // - cambiarFiltroTipo()
  // - cambiarFiltroUbicacion()
  // - onSearchChange()
  // - calcularPaginacion()
  // - cambiarPagina()
  // - cambiarItemsPorPagina()
  // - getPaginas()
  // - abrirModalNuevo()
  // - abrirModalEditar()
  // - cerrarModal()
  // - guardarDispositivo()
  // - validarFormulario()
  // - seleccionarEmpresa()
  // - filtrarEmpresas()
  // - seleccionarUbicacion()
  // - filtrarUbicaciones()
  // - seleccionarTipo()
  // - filtrarTipos()
  // - desactivarDispositivo()
  // - reactivarDispositivo()
  // - eliminarPermanente()
  // - exportarCSV()
  // - exportarExcel()
  // - getIconoTipo()
  // - getColorTipo()
  // - @HostListener('document:click')

  // ========================================
  // COPIA TODOS LOS MÉTODOS AQUÍ
  // ========================================

  aplicarFiltros() {
    let resultado = [...this.dispositivos];

    if (this.filtroActivo === 'activos') {
      resultado = resultado.filter(d => d.activo);
    } else if (this.filtroActivo === 'inactivos') {
      resultado = resultado.filter(d => !d.activo);
    }

    if (this.filtroTipo !== 0) {
      resultado = resultado.filter(d => d.tipo_id === this.filtroTipo);
    }

    if (this.filtroUbicacion !== 0) {
      resultado = resultado.filter(d => d.ubicacion_id === this.filtroUbicacion);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(d =>
        d.nombre.toLowerCase().includes(term) ||
        d.codigo.toLowerCase().includes(term) ||
        d.ubicacion_nombre?.toLowerCase().includes(term) ||
        d.empresa_nombre?.toLowerCase().includes(term) ||
        d.tipo_nombre?.toLowerCase().includes(term)
      );
    }

    this.dispositivosFiltrados = resultado;
    this.calcularPaginacion();
  }

  cambiarFiltro(filtro: 'todos' | 'activos' | 'inactivos') {
    this.filtroActivo = filtro;
    this.aplicarFiltros();
  }

  cambiarFiltroTipo(tipoId: number) {
    this.filtroTipo = tipoId;
    this.aplicarFiltros();
  }

  cambiarFiltroUbicacion(ubicacionId: number) {
    this.filtroUbicacion = ubicacionId;
    this.aplicarFiltros();
  }

  onSearchChange() {
    this.aplicarFiltros();
  }

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.dispositivosFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }
    this.actualizarPaginaActual();
  }

  actualizarPaginaActual() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.dispositivosPaginados = this.dispositivosFiltrados.slice(inicio, fin);
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

  abrirModalNuevo() {
    this.modoEdicion = false;
    this.dispositivoForm = {
      empresa_id: 0,
      ubicacion_id: 0,
      tipo_id: 0,
      codigo: '',
      nombre: '',
      activo: true
    };
    this.empresaSeleccionada = null;
    this.ubicacionSeleccionada = null;
    this.tipoSeleccionado = null;
    this.ubicacionesFiltradas = [...this.ubicaciones];
    this.showModal = true;
  }

  abrirModalEditar(dispositivo: PuntoVenta) {
    this.modoEdicion = true;
    this.dispositivoForm = { ...dispositivo };

    const empresa = this.empresas.find(e => e.id === dispositivo.empresa_id);
    this.empresaSeleccionada = empresa || null;

    const ubicacion = this.ubicaciones.find(u => u.id === dispositivo.ubicacion_id);
    this.ubicacionSeleccionada = ubicacion || null;

    const tipo = this.tiposDispositivo.find(t => t.id === dispositivo.tipo_id);
    this.tipoSeleccionado = tipo || null;

    if (empresa) {
      this.ubicacionesFiltradas = this.ubicaciones.filter(u => u.empresa_id === empresa.id);
    }

    this.showModal = true;

    console.log('📝 Editando dispositivo:', {
      id: dispositivo.id,
      empresa: empresa?.nombre,
      ubicacion: ubicacion?.nombre,
      tipo: tipo?.nombre
    });
  }

  cerrarModal() {
    this.showModal = false;
    this.dispositivoForm = {
      empresa_id: 0,
      ubicacion_id: 0,
      tipo_id: 0,
      codigo: '',
      nombre: '',
      activo: true
    };
    this.empresaSeleccionada = null;
    this.ubicacionSeleccionada = null;
    this.tipoSeleccionado = null;
    this.searchEmpresa = '';
    this.searchUbicacion = '';
    this.searchTipo = '';
  }

  guardarDispositivo() {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;

    const datosEnviar = {
      empresa_id: this.dispositivoForm.empresa_id,
      ubicacion_id: this.dispositivoForm.ubicacion_id,
      tipo_id: this.dispositivoForm.tipo_id,
      codigo: this.dispositivoForm.codigo,
      nombre: this.dispositivoForm.nombre,
      activo: this.dispositivoForm.activo
    };

    console.log('📤 Enviando datos:', datosEnviar);

    if (this.modoEdicion && this.dispositivoForm.id) {
      this.puntosVentaService.updatePuntoVenta(this.dispositivoForm.id, datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Dispositivo actualizado:', response);
            this.cargarDispositivos();
            this.cerrarModal();
            alert('Dispositivo actualizado exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al actualizar:', err);
            alert(err.error?.error || 'Error al actualizar el dispositivo');
            this.loading = false;
          }
        });
    } else {
      this.puntosVentaService.createPuntoVenta(datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Dispositivo creado:', response);
            this.cargarDispositivos();
            this.cerrarModal();
            alert('Dispositivo creado exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al crear:', err);
            alert(err.error?.error || 'Error al crear el dispositivo');
            this.loading = false;
          }
        });
    }
  }

  validarFormulario(): boolean {
    if (!this.dispositivoForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!this.dispositivoForm.codigo?.trim()) {
      alert('El código es obligatorio');
      return false;
    }
    if (!this.dispositivoForm.empresa_id || this.dispositivoForm.empresa_id === 0) {
      alert('Debes seleccionar una empresa');
      return false;
    }
    if (!this.dispositivoForm.ubicacion_id || this.dispositivoForm.ubicacion_id === 0) {
      alert('Debes seleccionar una ubicación');
      return false;
    }
    if (!this.dispositivoForm.tipo_id || this.dispositivoForm.tipo_id === 0) {
      alert('Debes seleccionar un tipo de dispositivo');
      return false;
    }
    return true;
  }

  // Selectores
  seleccionarEmpresa(empresa: Empresa) {
    this.empresaSeleccionada = empresa;
    this.dispositivoForm.empresa_id = empresa.id;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresas = false;

    this.ubicacionesFiltradas = this.ubicaciones.filter(u => u.empresa_id === empresa.id);

    if (this.ubicacionSeleccionada && this.ubicacionSeleccionada.empresa_id !== empresa.id) {
      this.ubicacionSeleccionada = null;
      this.dispositivoForm.ubicacion_id = 0;
    }

    console.log('✅ Empresa seleccionada:', empresa.nombre);
  }

  filtrarEmpresas() {
    // No necesita filtrado adicional, el HTML maneja el filtro
  }

  seleccionarUbicacion(ubicacion: Ubicacion) {
    this.ubicacionSeleccionada = ubicacion;
    this.dispositivoForm.ubicacion_id = ubicacion.id!;
    this.searchUbicacion = '';
    this.mostrarDropdownUbicaciones = false;

    console.log('✅ Ubicación seleccionada:', ubicacion.nombre);
  }

  filtrarUbicaciones() {
    if (!this.searchUbicacion.trim()) {
      if (this.empresaSeleccionada) {
        this.ubicacionesFiltradas = this.ubicaciones.filter(u => u.empresa_id === this.empresaSeleccionada!.id);
      } else {
        this.ubicacionesFiltradas = [...this.ubicaciones];
      }
    } else {
      const term = this.searchUbicacion.toLowerCase();
      const ubicacionesBase = this.empresaSeleccionada
        ? this.ubicaciones.filter(u => u.empresa_id === this.empresaSeleccionada!.id)
        : this.ubicaciones;

      this.ubicacionesFiltradas = ubicacionesBase.filter(u =>
        u.nombre.toLowerCase().includes(term) ||
        u.codigo.toLowerCase().includes(term)
      );
    }
  }

  seleccionarTipo(tipo: TipoPuntoVenta) {
    this.tipoSeleccionado = tipo;
    this.dispositivoForm.tipo_id = tipo.id;
    this.searchTipo = '';
    this.mostrarDropdownTipos = false;

    console.log('✅ Tipo seleccionado:', tipo.nombre);
  }

  filtrarTipos() {
    if (!this.searchTipo.trim()) {
      this.tiposDispositivoFiltrados = [...this.tiposDispositivo];
    } else {
      const term = this.searchTipo.toLowerCase();
      this.tiposDispositivoFiltrados = this.tiposDispositivo.filter(t =>
        t.nombre.toLowerCase().includes(term) ||
        t.codigo.toLowerCase().includes(term) ||
        t.descripcion?.toLowerCase().includes(term)
      );
    }
  }

  desactivarDispositivo(dispositivo: PuntoVenta) {
    if (!confirm(`¿Desactivar el dispositivo "${dispositivo.nombre}"?`)) {
      return;
    }

    this.puntosVentaService.desactivarPuntoVenta(dispositivo.id!)
      .subscribe({
        next: () => {
          console.log('✅ Dispositivo desactivado');
          this.cargarDispositivos();
          alert('Dispositivo desactivado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error al desactivar:', err);
          alert(err.error?.error || 'Error al desactivar el dispositivo');
        }
      });
  }

  reactivarDispositivo(dispositivo: PuntoVenta) {
    if (!confirm(`¿Reactivar el dispositivo "${dispositivo.nombre}"?`)) {
      return;
    }

    this.puntosVentaService.reactivarPuntoVenta(dispositivo.id!)
      .subscribe({
        next: () => {
          console.log('✅ Dispositivo reactivado');
          this.cargarDispositivos();
          alert('Dispositivo reactivado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error al reactivar:', err);
          alert(err.error?.error || 'Error al reactivar el dispositivo');
        }
      });
  }

  eliminarPermanente(dispositivo: PuntoVenta) {
    const mensaje = `⚠️ ADVERTENCIA: ELIMINACIÓN PERMANENTE
    
Estás a punto de ELIMINAR PERMANENTEMENTE:
- Dispositivo: ${dispositivo.nombre}
- Código: ${dispositivo.codigo}

Esta acción:
✗ NO se puede deshacer
✗ Eliminará todos los datos relacionados

¿Estás completamente seguro?`;

    if (!confirm(mensaje)) {
      return;
    }

    const confirmarNombre = prompt(
      `Para confirmar, escribe el nombre del dispositivo: "${dispositivo.nombre}"`
    );

    if (confirmarNombre !== dispositivo.nombre) {
      alert('El nombre no coincide. Eliminación cancelada.');
      return;
    }

    this.loading = true;

    this.puntosVentaService.eliminarPermanente(dispositivo.id!)
      .subscribe({
        next: () => {
          console.log('✅ Dispositivo eliminado permanentemente');
          this.cargarDispositivos();
          alert('Dispositivo eliminado permanentemente');
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error al eliminar:', err);
          alert(err.error?.error || 'Error al eliminar el dispositivo');
          this.loading = false;
        }
      });
  }

  exportarCSV() {
    if (this.dispositivosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosCSV = this.dispositivosFiltrados.map(d => ({
      'Código': d.codigo,
      'Nombre': d.nombre,
      'Tipo': d.tipo_nombre || '',
      'Ubicación': d.ubicacion_nombre || '',
      'Empresa': d.empresa_nombre || '',
      'Estado': d.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': d.created_at ? new Date(d.created_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosCSV);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `dispositivos_${fecha}.csv`);

    console.log('✅ CSV exportado:', datosCSV.length, 'registros');
  }

  exportarExcel() {
    if (this.dispositivosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosExcel = this.dispositivosFiltrados.map(d => ({
      'Código': d.codigo,
      'Nombre': d.nombre,
      'Tipo': d.tipo_nombre || '',
      'Categoría': d.tipo_categoria || '',
      'Ubicación': d.ubicacion_nombre || '',
      'Empresa': d.empresa_nombre || '',
      'Requiere Caja': d.tipo_requiere_caja ? 'Sí' : 'No',
      'Permite Ventas': d.tipo_permite_ventas ? 'Sí' : 'No',
      'Estado': d.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': d.created_at ? new Date(d.created_at).toLocaleDateString() : '',
      'Fecha Actualización': d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispositivos');

    const maxWidth = 30;
    const columnWidths = Object.keys(datosExcel[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }));
    worksheet['!cols'] = columnWidths;

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `dispositivos_${fecha}.xlsx`);

    console.log('✅ Excel exportado:', datosExcel.length, 'registros');
  }

  getIconoTipo(tipoCodigo?: string): string {
    if (!tipoCodigo) return 'fa-store';
    return this.tiposPuntoVentaService.getIconoPorCodigo(tipoCodigo);
  }

  getColorTipo(tipoColor?: string): string {
    if (!tipoColor) return '#6B7280';
    return tipoColor;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown-empresas')) {
      this.mostrarDropdownEmpresas = false;
    }
    if (!target.closest('.dropdown-ubicaciones')) {
      this.mostrarDropdownUbicaciones = false;
    }
    if (!target.closest('.dropdown-tipos')) {
      this.mostrarDropdownTipos = false;
    }
  }
}