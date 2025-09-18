import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarcodeDirective } from '../../../../shared/wrapperngx-barcode/barcode-wrapper.module';
import { QRCodeDirective } from '../../../../shared/qrcode/qr-code.directive';
import { EmpleadosService } from '../../../../services/sistemas/control_comidas/empleados.service';
import { EmpresasService } from '../../../../services/sistemas/control_comidas/empresas.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-imprecion-tarjetas',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeDirective, QRCodeDirective],
  templateUrl: './imprecion-tarjetas.component.html',
  styleUrls: ['./imprecion-tarjetas.component.css']
})
export class ImprecionTarjetasComponent implements OnInit {
  empleados: any[] = [];
  empleadosOriginal: any[] = [];
  empresas: any[] = [];
  busqueda = '';
  sugerencias: any[] = [];
  empresaSeleccionada: number | null = null;

  // Control para mostrar QR o placeholder
  showQR = true;

  constructor(
    private empleadosService: EmpleadosService,
    private empresasService: EmpresasService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.empleadosService.listarEmpleados().subscribe(data => {
      this.empleados = data;
      this.empleadosOriginal = [...data];

      // Cargar nombre de empresa en cada empleado
      this.empleados.forEach(emp =>
        this.empresasService
          .getEmpresaById(emp.empresa_id)
          .subscribe(e => (emp.empresaNombre = e.nombre))
      );
    });

    this.empresasService.listarEmpresas().subscribe(data => {
      this.empresas = data;
    });
  }

  toggleQR(): void {
    this.showQR = !this.showQR;
  }

  filtrarEmpleados(event: any): void {
    const valor = event.target.value.trim().toLowerCase();
    if (!valor) {
      this.sugerencias = [];
      this.empleados = [...this.empleadosOriginal];
      return;
    }
    this.sugerencias = this.empleadosOriginal.filter(emp =>
      emp.nombre.toLowerCase().includes(valor) ||
      emp.cedula.toLowerCase().includes(valor)
    );
  }

  seleccionarEmpleado(empleado: any): void {
    this.empleados = [empleado];
    this.sugerencias = [];
    this.busqueda = '';
  }

  resetBusqueda(): void {
    this.empleados = [...this.empleadosOriginal];
  }

  filtrarPorEmpresa(): void {
    if (this.empresaSeleccionada !== null) {
      const filtrados = this.empleadosOriginal.filter(
        emp => emp.empresa_id === this.empresaSeleccionada
      );
      this.empleados = filtrados.length ? filtrados : [];
    } else {
      this.resetBusqueda();
    }
  }

  exportarPDF(): void {
    console.log('exportarPDF disparado');

    const tarjetas = Array.from(document.querySelectorAll<HTMLElement>('.tarjeta'));
    if (!tarjetas.length) {
      console.error('No hay tarjetas para exportar');
      return;
    }

    // Dimensiones en mm (5.4cm x 8.6cm = 54mm x 86mm)
    const widthMM = 54;
    const heightMM = 86;

    // Generar imagen para cada tarjeta
    Promise.all(
      tarjetas.map(el =>
        html2canvas(el, { scale: 2 }).then(canvas => canvas.toDataURL('image/png'))
      )
    )
      .then(images => {
        // Crear PDF multipágina
        const pdf = new jsPDF({
          unit: 'mm',
          format: [widthMM, heightMM]
        });

        images.forEach((imgData, idx) => {
          if (idx > 0) {
            pdf.addPage([widthMM, heightMM], 'portrait');
          }
          pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM);
        });

        pdf.save('tarjetas.pdf');
      })
      .catch(err => console.error('Error al generar PDF:', err));
  }
}
