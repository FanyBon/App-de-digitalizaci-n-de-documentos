import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesService, ReportePorEmpleadoResponse } from '../../../../services/sistemas/control_comidas/reporte_comidas/reportes.service';
import { EmpresasService } from '../../../../services/empresas/empresas.service';
import { saveAs } from 'file-saver';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reporte-comidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-comidas.component.html',
  styleUrls: ['./reporte-comidas.component.css']
})
export class ReporteComidasComponent implements OnInit {
  empresas: any[] = [];
  empresaSeleccionada: number | null = null;

  periodoOptions = [
    { value: 'thisWeek',     label: 'Esta semana'    },
    { value: 'lastWeek',     label: 'Semana pasada'  },
    { value: 'last15Days',   label: 'Últimos 15 días' },
    { value: 'lastMonth',    label: 'Último mes'     },
    { value: 'last3Months',  label: 'Últimos 3 meses'},
    { value: 'custom',       label: 'Rango personalizado' }
  ];
  periodo = 'thisWeek';
  fechaInicio = '';
  fechaFin = '';
  grouped = true;

  exportExel=[];

  reporteDatos: any[] = [];
  mensajeError = '';
  rangoSeleccionado: { inicio: string; fin: string } | null = null;
  loading = false;

  constructor(
    private reportesService: ReportesService,
    private empresasService: EmpresasService
  ) {}

  ngOnInit(): void {
    this.empresasService.listarEmpresas()
      .subscribe(list => this.empresas = list);
  }

  generarReporte(): void {
    if (!this.empresaSeleccionada) {
      this.mensajeError = 'Debes seleccionar una empresa.';
      return;
    }
    if (this.periodo === 'custom' && (!this.fechaInicio || !this.fechaFin)) {
      this.mensajeError = 'Selecciona fecha de inicio y fin.';
      return;
    }

    this.mensajeError = '';
    this.loading = true;

    this.reportesService.reportePorEmpleado({
      empresaId:   this.empresaSeleccionada,
      periodo:     this.periodo,
      grouped:     this.grouped,
      fechaInicio: this.fechaInicio,
      fechaFin:    this.fechaFin
    })
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (resp: ReportePorEmpleadoResponse) => {
        this.reporteDatos     = resp.datos;
        this.rangoSeleccionado = resp.rango;
      },
      error: err => {
        console.error('Error al obtener reporte:', err);
        this.mensajeError = 'No se pudo generar el reporte.';
      }
    });
  }

  exportExcel(): void {
    if (!this.reporteDatos.length) return;

    // 1) Construir worksheet desde el JSON
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.reporteDatos);

    // 2) Opcional: renombrar columnas o reordenarlas
    //    XLSX.utils.sheet_add_aoa(ws, [['Empleado','# Comidas']], { origin: 'A1' });
    
    // 3) Crear workbook y añadir la hoja
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    // 4) Generar un ArrayBuffer en formato Excel
    const wbout: ArrayBuffer = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array'
    });

    // 5) Descargar con file-saver
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `reporte_comidas_${this.timestamp()}.xlsx`);
  }

  // ---------- EXPORTAR A CSV ----------

  exportCsv(): void {
    if (!this.reporteDatos.length) return;

    // 1) Construir worksheet para poder usar sheet_to_csv
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.reporteDatos);

    // 2) Convertir hoja a texto CSV
    const csv: string = XLSX.utils.sheet_to_csv(ws);

    // 3) Crear Blob y disparar descarga
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `reporte_comidas_${this.timestamp()}.csv`);
  }

  // ---------- UTILIDADES ----------

  /** Genera un timestamp YYYYMMDD_HHMMSS */
  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate())
    ].join('') + '_' + [
      pad(d.getHours()),
      pad(d.getMinutes()),
      pad(d.getSeconds())
    ].join('');
  }
}
