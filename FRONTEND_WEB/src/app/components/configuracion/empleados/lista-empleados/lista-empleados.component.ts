// src/app/components/configuracion/empleados/lista-empleados/lista-empleados.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  EmpleadosService, 
  Empleado, 
  EmpleadoCreate, 
  EmpleadoUpdate 
} from '../../../../services/sistemas/control_comidas/empleados.service';
import { EmpresasService } from '../../../../services/empresas/empresas.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lista-empleados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-empleados.component.html',
  styleUrls: ['./lista-empleados.component.css']
})
export class ListaEmpleadosComponent implements OnInit {
  Math = Math;

  // Datos
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  empleadosPaginados: Empleado[] = [];
  
  // Lista de empresas (para el select)
  empresas: any[] = [];
  empresasFiltradas: any[] = [];
  searchEmpresa: string = '';
  empresaSeleccionada: any | null = null;
  mostrarDropdownEmpresa: boolean = false;

  // Estados de carga
  loading: boolean = false;
  inicioCargaCompleto: boolean = false;
  error: string = '';

  // Modal
  showModal: boolean = false;
  modoEdicion: boolean = false;

  // Formulario
  empleadoForm: Partial<EmpleadoCreate> = {
    nombre: '',
    cedula: '',
    empresa_id: null,
    codigo_barras: '',
    codigo_qr: '',
    activo: true,
    max_asistencias_por_dia: 1,
    aplica_subsidio: false,
    id_ubicacion_empleado: '',
    sincronizado: false,
    monedero_id: null
  };

  // ID del empleado en edición
  empleadoIdEdicion: number | null = null;

  // Búsqueda y filtros
  searchTerm: string = '';
  filtroEstatus: 'todos' | 'activo' | 'inactivo' = 'activo';

  // Vista
  vistaActual: 'tabla' | 'tarjetas' = 'tabla';

  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;
  opcionesPaginacion: number[] = [10, 25, 50, 100, 200];

  constructor(
    private empleadosService: EmpleadosService,
    private empresasService: EmpresasService
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    this.loading = true;
    this.inicioCargaCompleto = false;
    this.error = '';

    // Cargar empresas primero
    this.empresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas.filter((e: any) => e.estatus === 'activo');
        this.empresasFiltradas = [...this.empresas];
        console.log('✅ Empresas cargadas:', this.empresas.length);

        // Luego cargar empleados
        this.cargarEmpleados();
      },
      error: (err) => {
        console.error('❌ Error al cargar empresas:', err);
        this.error = 'Error al cargar las empresas';
        this.loading = false;
        this.inicioCargaCompleto = false;
      }
    });
  }

  cargarEmpleados() {
    this.loading = true;
    this.error = '';

    const incluirInactivos = this.filtroEstatus === 'todos';

    this.empleadosService.listarEmpleados(incluirInactivos).subscribe({
      next: (empleados) => {
        this.empleados = empleados;
        this.aplicarFiltros();
        this.loading = false;
        this.inicioCargaCompleto = true;
        console.log('✅ Empleados cargados:', this.empleados.length);
      },
      error: (err) => {
        console.error('❌ Error al cargar empleados:', err);
        this.error = err.message || 'Error al cargar los empleados';
        this.loading = false;
        this.inicioCargaCompleto = false;
      }
    });
  }

  aplicarFiltros() {
    let resultado = [...this.empleados];

    // Filtro por estatus
    if (this.filtroEstatus !== 'todos') {
      const esActivo = this.filtroEstatus === 'activo';
      resultado = resultado.filter(e => e.activo === esActivo);
    }

    // Filtro por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(term) ||
        e.cedula.toLowerCase().includes(term) ||
        e.codigo_barras?.toLowerCase().includes(term) ||
        e.empresa_nombre?.toLowerCase().includes(term)
      );
    }

    this.empleadosFiltrados = resultado;
    this.calcularPaginacion();
  }

  cambiarFiltro(filtro: 'todos' | 'activo' | 'inactivo') {
    this.filtroEstatus = filtro;
    this.aplicarFiltros();
  }

  onSearchChange() {
    this.aplicarFiltros();
  }

  cambiarVista(vista: 'tabla' | 'tarjetas') {
    this.vistaActual = vista;
    console.log('🔄 Vista cambiada a:', vista);
  }

  // ====================================
  // GESTIÓN DE EMPRESAS EN EL FORMULARIO
  // ====================================

  filtrarEmpresas() {
    if (!this.searchEmpresa.trim()) {
      this.empresasFiltradas = [...this.empresas];
    } else {
      const term = this.searchEmpresa.toLowerCase();
      this.empresasFiltradas = this.empresas.filter((e: any) =>
        e.nombre.toLowerCase().includes(term) ||
        e.contacto?.toLowerCase().includes(term)
      );
    }
  }

  seleccionarEmpresa(empresa: any) {
    this.empresaSeleccionada = empresa;
    this.empleadoForm.empresa_id = empresa.id;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresa = false;
    console.log('✅ Empresa seleccionada:', empresa.nombre);
  }

  limpiarEmpresa() {
    this.empresaSeleccionada = null;
    this.empleadoForm.empresa_id = null;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresa = false;
    this.empresasFiltradas = [...this.empresas];
  }

  cambiarEmpresa() {
    this.empresaSeleccionada = null;
    this.empleadoForm.empresa_id = null;
    this.searchEmpresa = '';
    this.mostrarDropdownEmpresa = true;
    this.empresasFiltradas = [...this.empresas];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-empresa')) {
      this.mostrarDropdownEmpresa = false;
    }
  }

  // ====================================
  // PAGINACIÓN
  // ====================================

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.empleadosFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }
    this.actualizarPaginaActual();
  }

  actualizarPaginaActual() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.empleadosPaginados = this.empleadosFiltrados.slice(inicio, fin);
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

  // ====================================
  // EXPORTAR DATOS
  // ====================================

  exportarCSV() {
    if (this.empleadosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosCSV = this.empleadosFiltrados.map(e => ({
      'Nombre': e.nombre,
      'Cédula': e.cedula,
      'Empresa': e.empresa_nombre || 'N/A',
      'Código Barras': e.codigo_barras,
      'Max. Comidas/Día': e.max_asistencias_por_dia,
      'Aplica Subsidio': e.aplica_subsidio ? 'Sí' : 'No',
      'Estado': e.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': e.created_at ? new Date(e.created_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosCSV);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `empleados_${fecha}.csv`);

    console.log('✅ CSV exportado:', datosCSV.length, 'registros');
  }

  exportarExcel() {
    if (this.empleadosFiltrados.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const datosExcel = this.empleadosFiltrados.map(e => ({
      'Nombre': e.nombre,
      'Cédula': e.cedula,
      'Empresa': e.empresa_nombre || 'N/A',
      'Código Barras': e.codigo_barras,
      'Código QR': e.codigo_qr || 'N/A',
      'Max. Comidas/Día': e.max_asistencias_por_dia,
      'Aplica Subsidio': e.aplica_subsidio ? 'Sí' : 'No',
      'Ubicación Empleado': e.id_ubicacion_empleado || 'N/A',
      'Estado': e.activo ? 'Activo' : 'Inactivo',
      'Fecha Creación': e.created_at ? new Date(e.created_at).toLocaleDateString() : '',
      'Fecha Actualización': e.updated_at ? new Date(e.updated_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');

    const maxWidth = 30;
    const columnWidths = Object.keys(datosExcel[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }));
    worksheet['!cols'] = columnWidths;

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `empleados_${fecha}.xlsx`);

    console.log('✅ Excel exportado:', datosExcel.length, 'registros');
  }

  // ====================================
  // MODAL CRUD
  // ====================================

  abrirModalNuevo() {
    this.modoEdicion = false;
    this.empleadoIdEdicion = null;
    this.empleadoForm = {
      nombre: '',
      cedula: '',
      empresa_id: null,
      codigo_barras: '',
      codigo_qr: '',
      activo: true,
      max_asistencias_por_dia: 1,
      aplica_subsidio: false,
      id_ubicacion_empleado: '',
      sincronizado: false,
      monedero_id: null
    };
    this.empresaSeleccionada = null;
    this.searchEmpresa = '';
    this.empresasFiltradas = [...this.empresas];
    this.showModal = true;
  }

  abrirModalEditar(empleado: Empleado) {
    this.modoEdicion = true;
    this.empleadoIdEdicion = empleado.id;
    this.empleadoForm = {
      nombre: empleado.nombre,
      cedula: empleado.cedula,
      empresa_id: empleado.empresa_id,
      codigo_barras: empleado.codigo_barras,
      codigo_qr: empleado.codigo_qr || '',
      activo: empleado.activo,
      max_asistencias_por_dia: empleado.max_asistencias_por_dia,
      aplica_subsidio: empleado.aplica_subsidio,
      id_ubicacion_empleado: empleado.id_ubicacion_empleado || '',
      sincronizado: empleado.sincronizado,
      monedero_id: empleado.monedero_id
    };

    // Cargar empresa seleccionada
    const empresa = this.empresas.find((e: any) => e.id === empleado.empresa_id);
    this.empresaSeleccionada = empresa || null;
    
    this.searchEmpresa = '';
    this.empresasFiltradas = [...this.empresas];
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.modoEdicion = false;
    this.empleadoIdEdicion = null;
    this.empleadoForm = {
      nombre: '',
      cedula: '',
      empresa_id: null,
      codigo_barras: '',
      codigo_qr: '',
      activo: true,
      max_asistencias_por_dia: 1,
      aplica_subsidio: false,
      id_ubicacion_empleado: '',
      sincronizado: false,
      monedero_id: null
    };
    this.empresaSeleccionada = null;
    this.searchEmpresa = '';
  }

  guardarEmpleado() {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;

    const datosEnviar: EmpleadoCreate | EmpleadoUpdate = {
      nombre: this.empleadoForm.nombre!,
      cedula: this.empleadoForm.cedula!,
      empresa_id: this.empleadoForm.empresa_id!,
      codigo_barras: this.empleadoForm.codigo_barras || undefined,
      codigo_qr: this.empleadoForm.codigo_qr || undefined,
      activo: this.empleadoForm.activo,
      max_asistencias_por_dia: this.empleadoForm.max_asistencias_por_dia || 1,
      aplica_subsidio: this.empleadoForm.aplica_subsidio || false,
      id_ubicacion_empleado: this.empleadoForm.id_ubicacion_empleado || undefined,
      sincronizado: this.empleadoForm.sincronizado || false,
      monedero_id: this.empleadoForm.monedero_id || null
    };

    console.log('📤 Enviando datos:', datosEnviar);

    if (this.modoEdicion && this.empleadoIdEdicion) {
      this.empleadosService.editarEmpleado(this.empleadoIdEdicion, datosEnviar)
        .subscribe({
          next: (response) => {
            console.log('✅ Empleado actualizado:', response);
            this.cargarEmpleados();
            this.cerrarModal();
            alert('Empleado actualizado exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al actualizar:', err);
            alert(err.message || 'Error al actualizar el empleado');
            this.loading = false;
          }
        });
    } else {
      this.empleadosService.crearEmpleado(datosEnviar as EmpleadoCreate)
        .subscribe({
          next: (response) => {
            console.log('✅ Empleado creado:', response);
            this.cargarEmpleados();
            this.cerrarModal();
            alert('Empleado creado exitosamente');
          },
          error: (err) => {
            console.error('❌ Error al crear:', err);
            alert(err.message || 'Error al crear el empleado');
            this.loading = false;
          }
        });
    }
  }

  validarFormulario(): boolean {
    if (!this.empleadoForm.nombre?.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!this.empleadoForm.cedula?.trim()) {
      alert('La cédula es obligatoria');
      return false;
    }
    if (this.empleadoForm.cedula.length < 5) {
      alert('La cédula debe tener al menos 5 caracteres');
      return false;
    }
    if (!this.empleadoForm.empresa_id) {
      alert('Debes seleccionar una empresa');
      return false;
    }
    const maxComidas = this.empleadoForm.max_asistencias_por_dia || 1;
    if (maxComidas < 1 || maxComidas > 10) {
      alert('Las comidas por día deben estar entre 1 y 10');
      return false;
    }
    return true;
  }

  // ====================================
  // ACCIONES SOBRE EMPLEADOS
  // ====================================

  desactivarEmpleado(empleado: Empleado) {
    if (!confirm(`¿Desactivar al empleado "${empleado.nombre}"?`)) {
      return;
    }

    this.loading = true;

    this.empleadosService.desactivarEmpleado(empleado.id)
      .subscribe({
        next: () => {
          console.log('✅ Empleado desactivado');
          this.cargarEmpleados();
          alert('Empleado desactivado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error al desactivar:', err);
          alert(err.message || 'Error al desactivar el empleado');
          this.loading = false;
        }
      });
  }

  reactivarEmpleado(empleado: Empleado) {
    if (!confirm(`¿Reactivar al empleado "${empleado.nombre}"?`)) {
      return;
    }

    this.loading = true;

    this.empleadosService.reactivarEmpleado(empleado.id)
      .subscribe({
        next: () => {
          console.log('✅ Empleado reactivado');
          this.cargarEmpleados();
          alert('Empleado reactivado exitosamente');
        },
        error: (err) => {
          console.error('❌ Error al reactivar:', err);
          alert(err.message || 'Error al reactivar el empleado');
          this.loading = false;
        }
      });
  }

  eliminarPermanente(empleado: Empleado) {
    const mensaje = `⚠️ ADVERTENCIA: ELIMINACIÓN PERMANENTE
    
Estás a punto de ELIMINAR PERMANENTEMENTE:
- Empleado: ${empleado.nombre}
- Cédula: ${empleado.cedula}

Esta acción:
✗ NO se puede deshacer
✗ Eliminará todos los datos relacionados

¿Estás completamente seguro?`;

    if (!confirm(mensaje)) {
      return;
    }

    const confirmarNombre = prompt(
      `Para confirmar, escribe el nombre del empleado: "${empleado.nombre}"`
    );

    if (confirmarNombre !== empleado.nombre) {
      alert('El nombre no coincide. Eliminación cancelada.');
      return;
    }

    this.loading = true;

    this.empleadosService.eliminarEmpleado(empleado.id)
      .subscribe({
        next: () => {
          console.log('✅ Empleado eliminado permanentemente');
          this.cargarEmpleados();
          alert('Empleado eliminado permanentemente');
        },
        error: (err) => {
          console.error('❌ Error al eliminar:', err);
          alert(err.message || 'Error al eliminar el empleado');
          this.loading = false;
        }
      });
  }

  getBadgeEstatus(activo: boolean): string {
    return activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }
}