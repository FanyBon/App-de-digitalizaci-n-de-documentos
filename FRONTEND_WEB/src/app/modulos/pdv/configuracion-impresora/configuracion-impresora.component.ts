declare var qz: any;

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrinterService } from 'src/app/services/printer/printer.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-configuracion-impresora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-impresora.component.html',
  styleUrls: ['./configuracion-impresora.component.css']
})

export class ConfiguracionImpresoraComponent implements OnInit {
  estado = 'Desconectado';
  printers: string[] = [];
  selectedPrinter = '';

  constructor(private printerService: PrinterService) { }

  async ngOnInit(): Promise<void> {
    try {
      this.printers = await this.printerService.listPrinters();
      this.selectedPrinter = this.printers[0] || '';
      this.estado = `🖨 Impresoras detectadas: ${this.printers.join(', ')}`;
    } catch (err) {
      this.estado = '❌ Error al listar impresoras: ' + String(err);
    }
  }

  async conectar(): Promise<void> {
    try {
      await this.printerService.connect();
      this.estado = '✅ Conectado a QZ Tray';
    } catch (err) {
      this.estado = '❌ Error de conexión: ' + String(err);
    }
  }

  async imprimir(): Promise<void> {
    try {
      const data = [
        { type: 'raw', data: '\x1B\x40Prueba rápida\n\x1D\x56\x41' }
      ];
      await this.printerService.printRaw(this.selectedPrinter, data);
      this.estado = '🖨️ Ticket de prueba enviado';
    } catch (err) {
      this.estado = '❌ Error al imprimir: ' + String(err);
    }
  }

  async imprimirEjemplo(): Promise<void> {
    try {
      await this.printerService.printExample(this.selectedPrinter);
      this.estado = '🖨️ Ticket completo impreso y cajón abierto';
    } catch (err) {
      this.estado = '❌ Error al imprimir ejemplo: ' + String(err);
    }
  }
}
