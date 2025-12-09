import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import { EmpleadosService } from '../../../../services/sistemas/control_comidas/empleados.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode'; // Importamos la librería QR
import { BarcodeDirective } from '../../../../shared/wrapperngx-barcode/barcode-wrapper.module'; // Importa el módulo envoltorio
import { EmpresasService } from '../../../../services/empresas/empresas.service'; // Importa el servicio de empresas
import * as XLSX from 'xlsx';  // IMPORTANTE: Debe ir aquí, en el tope del archivo
import JsBarcode from 'jsbarcode';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeModule, BarcodeDirective],
  templateUrl: './empleados.component.html',
  styleUrls: ['./empleados.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]  // Opcional para avisar a Angular que se permiten elementos personalizados
})

export class EmpleadosComponent implements OnInit {

  //-----------------------------------------variables globales------------------------------------------
  empleados: any[] = [];
  mensajeError: string = '';
  // Controles para modales
  mostrarModalCrear: boolean = false;
  mostrarModalEditar: boolean = false;
  mostrarModalEliminar: boolean = false;
  empleadoSeleccionado: any = null;
  useCedulaAsBarcode = false;
  // Datos para crear empleado con los nuevos campos
  nuevoEmpleado: any = {
    nombre: '',
    cedula: '',
    empresa_id: null,
    max_asistencias_por_dia: 1,
    codigo_barras: '',
    codigo_qr: '',
    activo: true
  };
  // Datos para editar empleado (se clonará el empleado seleccionado)
  empleadoEditado: any = {
    nombre: '',
    cedula: '',
    empresa_id: null,
    codigo_barras: '',
    codigo_qr: '',
    activo: true
  };
  // Variables para imprimir QR en modal
  showPrintModal: boolean = false;
  printData: any = null;
  // Nueva propiedad para almacenar el arreglo completo de empresas
  empresas: any[] = [];
  // Variables para control de ordenamiento y vista completa de la tabla
  mostrarTodasColumnas: boolean = false;
  sortedColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  filteredEmpleados: any[] = []; // Lista de empleados filtrados para el autocomplete
  searchTerm: string = '';
  query: string = '';
  mostrarLista: boolean = false;
  //-----------------------------------------variables globales------------------------------------------

  @ViewChild('tarjetasContainer') tarjetasContainer!: ElementRef;

  constructor(
    private empleadosService: EmpleadosService,
    private empresasService: EmpresasService, // Inyecta el servicio de empresas
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarEmpresas(); // Carga las empresas al iniciar el componente
  }

  generateQRContent(emp: any): string {
    return `${emp.nombre} - ${emp.cedula} - ${emp.empresa_id} - ${emp.codigo_barras}`;
  }

  cargarEmpleados(): void {
    this.empleadosService.listarEmpleados().subscribe({
      next: (data) => {
        this.empleados = data.map(emp => ({
          ...emp,
          codigo_qr: this.generateQRContent(emp)
        }));
        this.filteredEmpleados = data;
      },
      error: (err) => {
        console.error('Error al listar empleados:', err);
        this.mensajeError = 'Error al cargar empleados.';
      }
    });
  }

  // Carga la lista de empresas desde el backend y guarda la respuesta completa en el arreglo.
  cargarEmpresas(): void {
    this.empresasService.listarEmpresas().subscribe({
      next: (data) => {
        this.empresas = data; // Guarda el arreglo completo con todas las propiedades
      },
      error: (err) => {
        console.error('Error al cargar empresas:', err);
      }
    });
  }

  generateQR(codigo: string): string {
    return codigo ? codigo : '';
  }

  // Métodos para crear empleado
  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
    // Reiniciamos el objeto para crear empleado (con campos nuevos)
    this.nuevoEmpleado = {
      nombre: '',
      cedula: '',
      empresa_id: null,
      codigo_barras: '',
      codigo_qr: '',
      activo: true,
      max_asistencias_por_dia: 1    // valor por defecto
    };
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear = false;
  }

  // Si activan el checkbox, sincronizamos el código de barras
  onCheckboxChange(): void {
    if (this.useCedulaAsBarcode) {
      this.nuevoEmpleado.codigo_barras = this.nuevoEmpleado.cedula;
    }
  }

  // Si cambian la cédula y el checkbox está activo, actualizamos el código
  onCedulaChange(newCedula: string): void {
    if (this.useCedulaAsBarcode) {
      this.nuevoEmpleado.codigo_barras = newCedula;
    }
  }

  confirmarCrearEmpleado(): void {
    this.nuevoEmpleado.codigo_qr = this.generateQRContent(this.nuevoEmpleado);
    this.empleadosService.crearEmpleado(this.nuevoEmpleado).subscribe({
      next: () => {
        this.cargarEmpleados();
        this.cerrarModalCrear();
      },
      error: (err) => {
        console.error('Error al crear empleado:', err);
        this.mensajeError = 'Error al crear empleado. Inténtalo nuevamente.';
      }
    });
  }

  // Métodos para editar empleado
  abrirModalEditar(empleado: any): void {
    this.mostrarModalEditar = true;
    this.empleadoSeleccionado = empleado;
    // Clonamos el objeto para edición, incluyendo los campos nuevos
    this.empleadoEditado = { ...empleado };

    // Si por alguna razón no viene, le ponemos 1 por defecto
    if (this.empleadoEditado.max_asistencias_por_dia == null) {
      this.empleadoEditado.max_asistencias_por_dia = 1;
    }
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
  }

  confirmarEditarEmpleado(): void {
    const id = this.empleadoSeleccionado.id;
    // Clonamos los datos del empleado editado
    const datosActualizados = { ...this.empleadoEditado };
    datosActualizados.codigo_qr = this.generateQRContent(datosActualizados);

    this.empleadosService.editarEmpleado(id, datosActualizados).subscribe({
      next: () => {
        this.cargarEmpleados();
        this.cerrarModalEditar();
      },
      error: (err) => {
        console.error('Error al editar empleado:', err);
        this.mensajeError = 'Error al editar empleado. Inténtalo nuevamente.';
      }
    });
  }

  // Métodos para eliminar empleado
  abrirModalEliminar(empleado: any): void {
    this.mostrarModalEliminar = true;
    this.empleadoSeleccionado = empleado;
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar = false;
  }

  confirmarEliminarEmpleado(): void {
    const id = this.empleadoSeleccionado.id;
    this.empleadosService.eliminarEmpleado(id).subscribe({
      next: () => {
        this.cargarEmpleados();
        this.cerrarModalEliminar();
      },
      error: (err) => {
        console.error('Error al eliminar empleado:', err);
        this.mensajeError = 'Error al eliminar empleado. Inténtalo nuevamente.';
      }
    });
  }

  /** FUNCIÓN PARA ABRIR EL MODAL DE IMPRESIÓN DEL QR **/
  openPrintModal(empleado: any): void {
    const qrContent = this.generateQRContent(empleado);
    this.printData = {
      empresa: 'Procomin',
      nombre: empleado.nombre,
      cedula: empleado.cedula,
      empresa_id: empleado.empresa_id,
      codigo_barras: empleado.codigo_barras,  // Este valor se usará localmente para generar el barcode
      codigo_qr: qrContent,
      fecha_impresion: new Date()
    };
    this.showPrintModal = true;
  }

  /** FUNCIÓN PARA IMPRIMIR: Solo se imprime el contenido del modal (printArea) */
  imprimirQR(): void {
    window.print();
    this.showPrintModal = false;
  }

  cancelarImpresion(): void {
    this.showPrintModal = false;
  }

  getNombreEmpresa(empresa_id: number): string {
    const empresa = this.empresas?.find(e => e.id === empresa_id);
    return empresa ? empresa.nombre : 'No encontrada';
  }

  // Función para ordenar la tabla según la columna
  sortData(column: string): void {
    if (this.sortedColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortedColumn = column;
      this.sortDirection = 'asc';
    }
    this.empleados.sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];

      // Para columnas de fecha
      if (column === 'created_at' || column === 'updated_at') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      // Para ordenar por nombre en la empresa (si la columna es empresa_id, ordenamos por el nombre de la empresa)
      if (column === 'empresa_id') {
        const nombreA = this.getNombreEmpresa(a.empresa_id).toLowerCase();
        const nombreB = this.getNombreEmpresa(b.empresa_id).toLowerCase();
        valueA = nombreA;
        valueB = nombreB;
      }
      // Si es string, convertir a minúsculas
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Función que filtra la lista de empleados según el término de búsqueda
  filtrarEmpleados(): void {
    if (!this.searchTerm) {
      this.filteredEmpleados = [];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredEmpleados = this.empleados.filter(empleado =>
      empleado.nombre.toLowerCase().includes(term) ||
      empleado.cedula.toLowerCase().includes(term)
    );
  }

  selectEmpleadoBusqueda(empleado: any): void {
    this.searchTerm = empleado.nombre;
    this.filteredEmpleados = [empleado];
    this.mostrarLista = false; // Oculta la lista al seleccionar
  }

  ocultarLista(): void {
    setTimeout(() => {
      this.mostrarLista = false; // Retraso para permitir selección antes de ocultar
    }, 200);
  }

  // Devuelve el icono apropiado para la columna a ordenar
  getSortIcon(column: string): string {
    if (this.sortedColumn !== column) {
      return 'fas fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }
  // Método que filtra la lista de empleados según el valor de searchTerm
  filtrarTabla(): void {
    // Normalizar el término de búsqueda
    const term = this.searchTerm?.trim().toLowerCase() || '';

    // Si no hay término, restaurar todos los empleados y ocultar sugerencias
    if (!term) {
      this.filteredEmpleados = [...this.empleados];
      this.mostrarLista = false;
      return;
    }

    // Filtrar por nombre o cédula
    this.filteredEmpleados = this.empleados.filter(emp =>
      emp.nombre.toLowerCase().includes(term) ||
      emp.cedula.toLowerCase().includes(term)
    );

    // Mostrar sugerencias solo si encontramos coincidencias
    this.mostrarLista = this.filteredEmpleados.length > 0;
  }


  // Función para alternar entre vista simplificada y vista completa de la tabla
  toggleTablaCompleta(): void {
    this.mostrarTodasColumnas = !this.mostrarTodasColumnas;
  }

  //-----------------FUNCIONES PARA GENERAR TARJETAS--------------------------------------------
  // Función para ver la tarjeta del empleado (a implementar según tu modal)
  verTarjeta(empleado: any): void {
    console.log('Ver tarjeta para:', empleado);
    // Aquí puedes abrir un modal que muestre la información completa del empleado.
  }


  //-----------------FUNCIONES PARA GENERAR TARJETAS--------------------------------------------

  //-----------------FUNCIONES DE EXPORTAR A EXEL Y CSV--------------------------------------------
  // Exportar a Excel utilizando XLSX
  exportarExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.empleados);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');
    XLSX.writeFile(workbook, 'empleados.xlsx');
  }

  // Exportar a CSV
  exportarCsv(): void {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Encabezado del CSV
    csvContent += "ID,Nombre,Cédula,Empresa,Código de Barras,Código QR,Activo,Creado,Actualizado,Sincronizado\r\n";
    this.empleados.forEach(empleado => {
      const empresa = this.getNombreEmpresa(empleado.empresa_id);
      const created = new Date(empleado.created_at).toLocaleString();
      const updated = new Date(empleado.updated_at).toLocaleString();
      const activo = empleado.activo ? "Sí" : "No";
      const sincronizado = empleado.sincronizado === 1 ? "Sí" : "No";
      csvContent += `${empleado.id},"${empleado.nombre}","${empleado.cedula}","${empresa}","${empleado.codigo_barras}","${empleado.codigo_qr}",${activo},${created},${updated},${sincronizado}\r\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "empleados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  //-----------------FUNCIONES DE EXPORTAR A EXEL Y CSV--------------------------------------------

}