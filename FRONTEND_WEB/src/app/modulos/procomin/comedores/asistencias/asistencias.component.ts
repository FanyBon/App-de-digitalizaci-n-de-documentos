// src/app/modules/control_comidas/asistencias/asistencias.component.ts
import { Component, OnInit } from '@angular/core';
import { AsistenciasService } from '../../../../services/sistemas/control_comidas/asistencias.service';
import { EmpresasService }   from '../../../../services/empresas/empresas.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.css']
})
export class AsistenciasComponent implements OnInit {
  asistencias: any[] = [];
  mensajeError: string = '';

  // Controles de modales
  mostrarModalCrear: boolean = false;
  mostrarModalEditar: boolean = false;
  mostrarModalEliminar: boolean = false;

  asistenciaSeleccionada: any = null;

  // Datos para crear asistencia (incluye "empleado_id", "fecha", "horario", "metodo", "empresa_id")
  nuevaAsistencia: any = {
    empleado_id: null,
    fecha: '',
    horario: 'desayuno',   
    metodo: 'qr',
    empresa_id: null
  };

  // Datos para editar asistencia
  asistenciaEditada: any = {
    empleado_id: null,
    fecha: '',
    horario: 'desayuno',
    metodo: 'qr',
    empresa_id: null
  };
  empresas: any[]    = [];
  // filtros
  filtroFechaInicio: string = '';
  filtroFechaFin:    string = '';
  filtroEmpresaId:   number | null = null;

  constructor(
    private asistenciasService: AsistenciasService,
    private empresasService: EmpresasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEmpresas();
    this.cargarAsistencias();
  }

  private loadEmpresas(): void {
    this.empresasService.listarEmpresas().subscribe({
      next: data => this.empresas = data,
      error: err => console.error('Error cargando empresas:', err)
    });
  }

  cargarAsistencias(): void {
    this.asistenciasService.listarAsistencias().subscribe({
      next: (data) => { this.asistencias = data; },
      error: (err) => {
        console.error('Error al listar asistencias:', err);
        this.mensajeError = 'Error al cargar asistencias.';
      }
    });
  }

  // Crear asistencia
  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
    this.nuevaAsistencia = {
      empleado_id: null,
      fecha: '',
      horario: 'desayuno',
      metodo: 'qr',
      empresa_id: null
    };
  }
  cerrarModalCrear(): void { this.mostrarModalCrear = false; }
  confirmarCrearAsistencia(): void {
    this.asistenciasService.crearAsistencia(this.nuevaAsistencia).subscribe({
      next: () => { this.cargarAsistencias(); this.cerrarModalCrear(); },
      error: (err) => {
        console.error('Error al crear asistencia:', err);
        this.mensajeError = 'Error al crear asistencia. Inténtalo nuevamente.';
      }
    });
  }

  filtrarAsistencias(): void {
    if (
      this.filtroFechaInicio &&
      this.filtroFechaFin &&
      this.filtroEmpresaId !== null
    ) {
      this.asistenciasService
        .listarAsistenciasPorRango(
          this.filtroEmpresaId,
          this.filtroFechaInicio,
          this.filtroFechaFin
        )
        .subscribe({
          next: data => this.asistencias = data,
          error: err => {
            console.error('Error al filtrar asistencias:', err);
            this.mensajeError = 'Error al aplicar filtros.';
          }
        });
    } else {
      // Si falta algún filtro, recargar todo
      this.cargarAsistencias();
    }
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin    = '';
    this.filtroEmpresaId   = null;
    this.cargarAsistencias();
  }

  // Editar asistencia
  abrirModalEditar(asistencia: any): void {
    this.mostrarModalEditar = true;
    this.asistenciaSeleccionada = asistencia;
    this.asistenciaEditada = { ...asistencia };
  }
  cerrarModalEditar(): void { this.mostrarModalEditar = false; }
  confirmarEditarAsistencia(): void {
    const id = this.asistenciaSeleccionada.id;
    this.asistenciasService.editarAsistencia(id, this.asistenciaEditada).subscribe({
      next: () => { this.cargarAsistencias(); this.cerrarModalEditar(); },
      error: (err) => {
        console.error('Error al editar asistencia:', err);
        this.mensajeError = 'Error al editar asistencia. Inténtalo nuevamente.';
      }
    });
  }

  // Eliminar asistencia
  abrirModalEliminar(asistencia: any): void {
    this.mostrarModalEliminar = true;
    this.asistenciaSeleccionada = asistencia;
  }
  cerrarModalEliminar(): void { this.mostrarModalEliminar = false; }
  confirmarEliminarAsistencia(): void {
    const id = this.asistenciaSeleccionada.id;
    this.asistenciasService.eliminarAsistencia(id).subscribe({
      next: () => { this.cargarAsistencias(); this.cerrarModalEliminar(); },
      error: (err) => {
        console.error('Error al eliminar asistencia:', err);
        this.mensajeError = 'Error al eliminar asistencia. Inténtalo nuevamente.';
      }
    });
  }

  // Funciones de exportación (stubs)

  // --- Exportar a Excel ---
  exportarExcel(): void {
    // 1. Definir cabeceras en el orden deseado
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
      this.asistencias.map(a => ({
        ID: a.id,
        'Empleado ID': a.empleado_id,
        'Empresa ID': a.empresa_id,
        Fecha: new Date(a.fecha).toLocaleString(),
        Horario: a.horario,
        Método: a.metodo
      }))
    );

    // 2. Crear workbook y añadir worksheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

    // 3. Generar buffer de Excel
    const excelBuffer: any = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array'
    });

    // 4. Guardar archivo
    this.guardarArchivoExcel(excelBuffer, 'asistencias');
  }

  private guardarArchivoExcel(buffer: any, nombre: string): void {
    const blob = new Blob([buffer], {
      type: 'application/octet-stream'
    });
    saveAs(blob, `${nombre}_${Date.now()}.xlsx`);
  }

  // --- Exportar a CSV ---
  exportarCsv(): void {
    // 1. Cabeceras
    const headers = ['ID','Empleado ID','Empresa ID','Fecha','Horario','Método'];
    // 2. Filas
    const rows = this.asistencias.map(a => [
      a.id,
      a.empleado_id,
      a.empresa_id,
      new Date(a.fecha).toLocaleString(),
      a.horario,
      a.metodo
    ]);

    // 3. Construir string CSV
    let csv = headers.join(',') + '\n'
      + rows.map(r => r.map(item => `"${item}"`).join(',')).join('\n');

    // 4. Descargar con BOM para compatibilidad Excel
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    saveAs(blob, `asistencias_${Date.now()}.csv`);
  }
}
