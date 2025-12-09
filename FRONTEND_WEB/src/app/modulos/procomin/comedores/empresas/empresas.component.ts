import { Component, OnInit } from '@angular/core';
import { EmpresasService } from '../../../../services/empresas/empresas.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.css']
})
export class EmpresasComponent implements OnInit {
  empresas: any[] = [];
  mensajeError: string = '';

  // Control para modales
  mostrarModalCrear: boolean = false;
  mostrarModalEditar: boolean = false;
  mostrarModalEliminar: boolean = false;

  empresaSeleccionada: any = null;
  
  // Crear
  nuevaEmpresa: any = {
    nombre: '',
    contacto: '',
    telefono: '',
    estatus: 'activo',
    parent_id: null,
    costo_charola: 0,
    estimado_personas: 0
  };

  // Editar
  empresaEditada: any = {
    nombre: '',
    contacto: '',
    telefono: '',
    estatus: 'activo',
    parent_id: null,
    costo_charola: 0,
    estimado_personas: 0
  };
  empresasFiltradas: any[] = [];
  filtro = '';

  constructor(private empresasService: EmpresasService, private router: Router) {}

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.empresasService.listarEmpresas().subscribe({
      next: (data) => {
        this.empresas = data;
        this.empresasFiltradas = data;
      },
      error: (err) => {
        console.error('Error al listar empresas:', err);
        this.mensajeError = 'Error al cargar empresas.';
      }
    });
  }

  // Métodos para crear empresa
  abrirModalCrear(): void {
    this.mostrarModalCrear = true;
    this.nuevaEmpresa = { nombre: '', contacto: '', telefono: '' };
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear = false;
  }

  confirmarCrearEmpresa(): void {
    this.empresasService.crearEmpresa(this.nuevaEmpresa).subscribe({
      next: () => {
        this.cargarEmpresas();
        this.cerrarModalCrear();
      },
      error: (err) => {
        console.error('Error al crear empresa:', err);
        this.mensajeError = 'Error al crear empresa. Inténtalo nuevamente.';
      }
    });
  }

  // Métodos para editar empresa
  abrirModalEditar(empresa: any): void {
    this.mostrarModalEditar = true;
    this.empresaSeleccionada = empresa;
    this.empresaEditada = { ...empresa };  // Clonamos para editar
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.empresaSeleccionada = null;
  }

  confirmarEditarEmpresa(): void {
    const id = this.empresaSeleccionada.id;
    this.empresasService.editarEmpresa(id, this.empresaEditada).subscribe({
      next: () => {
        this.cargarEmpresas();
        this.cerrarModalEditar();
      },
      error: (err) => {
        console.error('Error al editar empresa:', err);
        this.mensajeError = 'Error al editar empresa. Inténtalo nuevamente.';
      }
    });
  }

  // Razona el nombre de la empresa padre
  getParentName(parentId: number | null): string {
    if (!parentId) return '-';
    const p = this.empresas.find(e => e.id === parentId);
    return p ? p.nombre : '-';
  }

  // Métodos para eliminar empresa
  abrirModalEliminar(empresa: any): void {
    this.mostrarModalEliminar = true;
    this.empresaSeleccionada = empresa;
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar = false;
  }

  confirmarEliminarEmpresa(): void {
    const id = this.empresaSeleccionada.id;
    this.empresasService.eliminarEmpresa(id).subscribe({
      next: () => {
        this.cargarEmpresas();
        this.cerrarModalEliminar();
      },
      error: (err) => {
        console.error('Error al eliminar empresa:', err);
        this.mensajeError = 'Error al eliminar empresa. Inténtalo nuevamente.';
      }
    });
  }

  aplicarFiltro(): void {
    const term = this.filtro.toLowerCase().trim();
    this.empresasFiltradas = this.empresas.filter(e =>
      e.nombre.toLowerCase().includes(term) ||
      e.contacto.toLowerCase().includes(term) ||
      e.telefono.includes(term)
    );
  }

  exportarCsv(): void {
  // 1) Cabeceras
  const headers = [
    'ID','Nombre','Contacto','Teléfono',
    'Estatus','Empresa Padre','Costo Charola','Estimado Personas'
  ];

  // 2) Filas según datos filtrados
  const rows = this.empresasFiltradas.map(e => [
    e.id,
    e.nombre,
    e.contacto,
    e.telefono,
    e.estatus,
    this.getParentName(e.parent_id),
    e.costo_charola,
    e.estimado_personas
  ]);

  // 3) Construir CSV
  let csv = headers.join(',') + '\n';
  rows.forEach(r => {
    csv += r
      .map(field => `"${String(field).replace(/"/g, '""')}"`)
      .join(',') + '\n';
  });

  // 4) Descargar como archivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'empresas.csv';
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

exportarExcel(): void {
  // 1) Preparar datos en JSON
  const data = this.empresasFiltradas.map(e => ({
    ID: e.id,
    Nombre: e.nombre,
    Contacto: e.contacto,
    Teléfono: e.telefono,
    Estatus: e.estatus,
    Padre: this.getParentName(e.parent_id),
    'Costo Charola': e.costo_charola,
    'Estimado Personas': e.estimado_personas
  }));

  // 2) Crear hoja y libro de trabajo
  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Empresas');

  // 3) Generar buffer y descargar
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, 'empresas.xlsx');
}

}
