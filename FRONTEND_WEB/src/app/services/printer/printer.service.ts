declare var qz: any;

import { Injectable } from '@angular/core';

// Tipos para los recibos de impresión
interface ReceiptItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  subsidio_aplicado?: number;
}

interface ReceiptVenta {
  venta_id?: number;
  referencia?: string;
  usuario_nombre?: string;
  empleado_nombre?: string;
  fecha?: string;
  metodo_codigo?: string;
  metodo_nombre?: string;
  cambio?: number;
  items: ReceiptItem[];
  total_bruto: number;
  total_subsidio: number;
  total_neto: number;
}


@Injectable({ providedIn: 'root' })
export class PrinterService {
  private connected = false;

  /** Asegura que haya una conexión activa con QZ Tray */
  private async ensureConnection(): Promise<void> {
    try {
      console.log('PrinterService.ensureConnection: websocket active?', !!qz?.websocket?.isActive && qz.websocket.isActive());
    } catch (e) {
      console.warn('PrinterService.ensureConnection: qz not available yet', e);
    }

    if (!this.connected && (!qz?.websocket || !qz.websocket.isActive())) {
      try {
        console.log('PrinterService: conectando a QZ Tray...');
        await qz.websocket.connect();
        this.connected = true;
        console.log('PrinterService: conectado a QZ Tray');
      } catch (err) {
        console.error('PrinterService.ensureConnection error connecting:', err);
        throw err;
      }
    } else {
      this.connected = true;
    }
  }

  async connect(): Promise<void> {
    await this.ensureConnection();
  }

  /** Desconecta del agente QZ Tray */
  async disconnect(): Promise<void> {
    if (this.connected && qz?.websocket?.isActive && qz.websocket.isActive()) {
      try {
        await qz.websocket.disconnect();
      } catch (err) {
        console.warn('PrinterService.disconnect: error disconnecting', err);
      }
      this.connected = false;
    }
  }

  /** Devuelve la lista de impresoras locales */
  async listPrinters(): Promise<string[]> {
    await this.ensureConnection();
    const result = await qz.printers.find();
    return Array.isArray(result) ? result : [result];
  }

  /** Envía datos raw ESC/POS a la impresora seleccionada */
  async printRaw(printerName: string, data: { type: string; data: string }[]): Promise<void> {
    await this.ensureConnection();
    const config = qz.configs.create(printerName);
    await this.safePrint(config, data);
  }

  /** Wrapper que intenta reintentar si falla la primera impresión */
  private async safePrint(config: any, lines: any[]): Promise<void> {
    try {
      console.log('PrinterService.safePrint: printing, lines:', lines?.length ?? 0);
      await qz.print(config, lines);
      console.log('PrinterService.safePrint: print OK');
    } catch (err) {
      console.warn('PrinterService.safePrint: primer intento falló, reintentando con reconexión', err);
      try {
        await qz.websocket.disconnect().catch(() => { });
      } catch (_) { }
      try {
        await qz.websocket.connect();
      } catch (errConnect) {
        console.error('PrinterService.safePrint: reconexión falló', errConnect);
        throw errConnect;
      }
      // reintentar impresión
      try {
        await qz.print(config, lines);
        console.log('PrinterService.safePrint: print OK después de reconexión');
      } catch (err2) {
        console.error('PrinterService.safePrint: reintento de impresión falló', err2);
        throw err2;
      }
    }
  }

  /** Imprime un ticket de ejemplo con corte y apertura de cajón */
  async printExample(printerName: string): Promise<void> {
    await this.ensureConnection();
    const config = qz.configs.create(printerName, {
      encoding: 'CP857',
      endOfReceipt: '\n\n'
    });

    const cmds = [
      { type: 'raw', data: '\x1B\x40' },                            // Init
      { type: 'raw', data: '\x1B\x61\x01MI COMIDA RÁPIDA\n' },      // Título centrado
      { type: 'raw', data: `\x1B\x61\x00Fecha: ${new Date().toLocaleString()}\n` },
      { type: 'raw', data: '-------------------------------\n' },
      { type: 'raw', data: '1 x Hamburguesa    $ 80.00\n' },
      { type: 'raw', data: '2 x Papas           $ 50.00\n' },
      { type: 'raw', data: '1 x Refresco        $ 35.00\n' },
      { type: 'raw', data: '-------------------------------\n' },
      { type: 'raw', data: '\x1B\x21\x20TOTAL: $165.00\n' },
      { type: 'raw', data: '\x1B\x21\x00Gracias por su preferencia\n' },
      { type: 'raw', data: '\x1D\x56\x01' },                        // Corte parcial
      { type: 'raw', data: '\x1B\x70\x00\x64\x64' }                // Pulso al cajón
    ];

    await this.safePrint(qz.configs.create(printerName, { encoding: 'CP857', endOfReceipt: '\n\n' }), cmds);
  }

  // printReceipt: crea líneas ESC/POS desde el objeto receipt y usa safePrint
  // printReceipt: crea líneas ESC/POS desde el objeto receipt y usa safePrint
  async printReceipt(printerName: string, receipt: {
    tipo: 'normal' | 'monedero',
    venta: ReceiptVenta,
    monedero?: { saldo_anterior: number, saldo_final: number }
  }): Promise<void> {
    await this.ensureConnection();

    const config = qz.configs.create(printerName, { encoding: 'CP857', endOfReceipt: '\n\n' });
    const v = receipt.venta;
    const lines: { type: string; data: string }[] = [];

    // Inicio y encabezado
    lines.push({ type: 'raw', data: '\x1B\x40' });                 // Inicializar
    lines.push({ type: 'raw', data: '\x1B\x61\x01' });             // Centrar

    // Título grande y en negritas (doble ancho + doble alto + énfasis)
    lines.push({ type: 'raw', data: '\x1B\x21\x30' });             // ESC ! 0x30 -> doble ancho+alto
    lines.push({ type: 'raw', data: '\x1B\x45\x01PROCOMIN\n' });   // ENCENDER énfasis y texto
    lines.push({ type: 'raw', data: '\x1B\x45\x00' });             // APAGAR énfasis
    lines.push({ type: 'raw', data: '\x1B\x21\x00' });             // Volver a tamaño normal

    // Fecha y metadatos centrados
    lines.push({ type: 'raw', data: `Fecha: ${v.fecha ?? new Date().toLocaleString()}\n` });
    if (v.referencia) lines.push({ type: 'raw', data: `Ref: ${v.referencia}\n` });
    if (v.venta_id) lines.push({ type: 'raw', data: `Venta ID: ${v.venta_id}\n` });

    // Empleado y Usuario (centrados)
    if (v.empleado_nombre) lines.push({ type: 'raw', data: `Empleado: ${v.empleado_nombre}\n` });
    if (v.usuario_nombre) lines.push({ type: 'raw', data: `Usuario: ${v.usuario_nombre}\n` });

    lines.push({ type: 'raw', data: '-------------------------------\n' });

    // Items: alinear a la izquierda para mejor control
    lines.push({ type: 'raw', data: '\x1B\x61\x00' }); // Alinear izquierda
    for (const it of v.items) {
      const name = (it.nombre ?? '').slice(0, 20).padEnd(20, ' ');
      const qty = String(it.cantidad).padStart(2, ' ');
      const price = Number(it.precio_unitario ?? 0).toFixed(2).padStart(7, ' ');
      lines.push({ type: 'raw', data: `${qty} x ${name} ${price}\n` });
      if (it.subsidio_aplicado && it.subsidio_aplicado > 0) {
        lines.push({ type: 'raw', data: `   Sub.: -${it.subsidio_aplicado.toFixed(2)}\n` });
      }
    }
    lines.push({ type: 'raw', data: '-------------------------------\n' });

    // Totales
    lines.push({ type: 'raw', data: `TOTAL: $${Number(v.total_bruto ?? 0).toFixed(2)}\n` });
    if (v.total_subsidio && v.total_subsidio > 0) {
      lines.push({ type: 'raw', data: `SUBSIDIO: -$${Number(v.total_subsidio).toFixed(2)}\n` });
    }
    // Mostrar total a pagar en modo destacado
    lines.push({ type: 'raw', data: '\x1B\x21\x20TOTAL A PAGAR: $' + Number(v.total_neto ?? 0).toFixed(2) + '\n' });

    // Si el pago fue en efectivo y existe cambio mostrarlo
    if (v.metodo_codigo === 'efectivo' && typeof v.cambio === 'number' && v.cambio > 0) {
      lines.push({ type: 'raw', data: `Cambio: $${Number(v.cambio).toFixed(2)}\n` });
    }

    // Si es monedero mostrar saldos
    if (receipt.tipo === 'monedero' && receipt.monedero) {
      lines.push({ type: 'raw', data: '-------------------------------\n' });
      lines.push({ type: 'raw', data: `Saldo ant: $${Number(receipt.monedero.saldo_anterior ?? 0).toFixed(2)}\n` });
      lines.push({ type: 'raw', data: `Saldo act: $${Number(receipt.monedero.saldo_final ?? 0).toFixed(2)}\n` });
    }

    // Método de pago (si existe)
    if (v.metodo_nombre) {
      lines.push({ type: 'raw', data: `Pago: ${v.metodo_nombre}\n` });
    }

    // Mensaje final — asegurar que quede en una sola línea y sin cortes internos
    const thankYou = 'Gracias por su compra';
    const maxLine = 32; // ancho típico del rollo; ajustar si tu impresora usa más/menos
    const cleanThankYou = thankYou.replace(/\s+/g, ' ').trim(); // asegurar un solo espacio
    // Si es más largo que ancho, dividir en piezas sin cortar palabras
    if (cleanThankYou.length <= maxLine) {
      lines.push({ type: 'raw', data: cleanThankYou + '\n' });
    } else {
      const words = cleanThankYou.split(' ');
      let lineAcc = '';
      for (const w of words) {
        if ((lineAcc + ' ' + w).trim().length <= maxLine) {
          lineAcc = (lineAcc + ' ' + w).trim();
        } else {
          lines.push({ type: 'raw', data: lineAcc + '\n' });
          lineAcc = w;
        }
      }
      if (lineAcc) lines.push({ type: 'raw', data: lineAcc + '\n' });
    }

    // Algunos saltos para separación física antes del corte
    lines.push({ type: 'raw', data: '\n\n\n\n\n\n' });

    // Corte y cajón
    lines.push({ type: 'raw', data: '\x1D\x56\x01' });             // Corte parcial
    lines.push({ type: 'raw', data: '\x1B\x70\x00\x64\x64' });     // Pulso al cajón

    console.log('PrinterService.printReceipt: enviando a impresora', printerName, 'líneas:', lines.length);
    await this.safePrint(config, lines);
  }
}