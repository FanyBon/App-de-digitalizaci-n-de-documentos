// src/app/modulos/procomin/import-empleados/import-empleados.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportEmpleadosService, ImportReport } from '../../../services/import/import-empleados.service';

@Component({
  selector: 'app-import-empleados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-empleados.component.html',
  styleUrls: ['./import-empleados.component.css']
})
export class ImportEmpleadosComponent {
  mostrarCarga = false;
  archivoCSV: File | null = null;
  cargando = false;
  report: ImportReport | null = null;
  errorMessage = '';
  mostrarModalExito = false;
  mostrarModalError = false;

  constructor(private importSvc: ImportEmpleadosService) { }

  toggleCarga() {
    this.mostrarCarga = !this.mostrarCarga;
    this.report = null;
    this.errorMessage = '';
    this.archivoCSV = null;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoCSV = input.files?.[0] ?? null;
  }

  subir() {
    if (!this.archivoCSV) return;
    this.cargando = true;
    this.importSvc.importarCSV(this.archivoCSV).subscribe({
      next: (r) => {
        this.report = r;
        this.cargando = false;
        this.mostrarModalExito = true;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error desconocido';
        this.cargando = false;
        this.mostrarModalError = true;
      }
    });
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
  }

  cerrarModalError() {
    this.mostrarModalError = false;
  }

  // MMétodo para descargar la plantilla CSV
  downloadTemplate() {
    const header = ['Clave del Empleado', 'Compania', 'Ubicacion del Colaborador'].join(',') + '\n';
    // añadir BOM para que Excel reconozca UTF-8
    const csvContent = '\uFEFF' + header;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'plantilla_empleados.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

}