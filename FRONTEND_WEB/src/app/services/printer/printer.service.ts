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
  // Añadir estas propiedades opcionales
  efectivo_entregado?: number;
  efectivo_recibido?: number;
  monto_recibido?: number;
  change?: number;
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

  // Función para imprimir ticket con formato profesional ESC/POS
async printReceipt(
  printerName: string,
  receipt: {
    tipo: 'normal' | 'monedero',
    venta: {
      fecha?: string;
      referencia?: string;
      venta_id?: number;
      empleado_nombre?: string | null;
      usuario_nombre?: string | null;
      items: Array<{ nombre: string; descripcion?: string; cantidad: number; precio_unitario: number; subsidio_aplicado?: number }>;
      total_bruto?: number;
      total_subsidio?: number;
      total_neto?: number;
      metodo_codigo?: string;
      metodo_nombre?: string;
      cambio?: number;
      efectivo_entregado?: number;
    },
    monedero?: { saldo_anterior: number; saldo_final: number }
  }
): Promise<void> {

  await this.ensureConnection();

  const config = qz.configs.create(printerName, {
    encoding: 'CP857',
    endOfReceipt: '\n\n'
  });

  const v = receipt.venta || ({} as any);
  const lines: { type: string; data: string }[] = [];
  const fmt = (n: any) => Number(n || 0).toFixed(2);
  const WIDTH = 32; // ancho típico de 58mm

  // === Helpers ===
  const lineWithRight = (left: string, right: string) => {
    const l = left.trim();
    const r = right.trim();
    const space = Math.max(1, WIDTH - l.length - r.length);
    return l + ' '.repeat(space) + r;
  };

  const centerText = (text: string) => {
    const t = text.trim();
    const leftPad = Math.floor((WIDTH - t.length) / 2);
    return ' '.repeat(Math.max(0, leftPad)) + t + '\n';
  };

  // === ENCABEZADO ===
  lines.push({ type: 'raw', data: '\x1B\x40' }); // init
  lines.push({ type: 'raw', data: '\x1B\x61\x01' }); // centrar
  lines.push({ type: 'raw', data: '\x1B\x21\x30\x1B\x45\x01' }); // grande + negrita
  lines.push({ type: 'raw', data: 'PROCOMIN\n' });
  lines.push({ type: 'raw', data: '\x1B\x21\x00\x1B\x45\x00' }); // normal
  lines.push({ type: 'raw', data: centerText('Profesionales en Comidas Industriales') });
  lines.push({ type: 'raw', data: '--------------------------------\n' });

  // === METADATOS ===
  lines.push({ type: 'raw', data: '\x1B\x61\x00' }); // izquierda
  lines.push({ type: 'raw', data: `Fecha: ${v.fecha ?? new Date().toLocaleString()}\n` });
  if (v.referencia) lines.push({ type: 'raw', data: `Referencia: ${v.referencia}\n` });
  if (v.venta_id) lines.push({ type: 'raw', data: `Venta ID: ${v.venta_id}\n` });
  if (v.empleado_nombre) lines.push({ type: 'raw', data: `Empleado: ${v.empleado_nombre}\n` });
  if (v.usuario_nombre) lines.push({ type: 'raw', data: `Usuario: ${v.usuario_nombre}\n` });
  lines.push({ type: 'raw', data: '--------------------------------\n' });

  // === ITEMS ===
  lines.push({ type: 'raw', data: 'CANT DESCRIPCIÓN IMPORTE\n' });
  lines.push({ type: 'raw', data: '--------------------------------\n' });

  for (const it of v.items || []) {
    // corregir nombres tipo "Producto 24"
    let name = (it.nombre ?? '').trim();
    if (/^producto\s*\d*$/i.test(name) && it.descripcion) {
      name = it.descripcion;
    }
    if (!name || name === '') name = 'SIN DESCRIPCIÓN';

    const qty = String(it.cantidad ?? 0).padStart(2, ' ');
    const shortName = name.slice(0, 18).padEnd(18, ' ');
    const price = fmt(it.precio_unitario).padStart(7, ' ');
    lines.push({ type: 'raw', data: `${qty}x ${shortName}${price}\n` });

    if (it.subsidio_aplicado && it.subsidio_aplicado > 0) {
      lines.push({ type: 'raw', data: ` Subsidio: -${fmt(it.subsidio_aplicado)}\n` });
    }
  }

  // === TOTALES ===
  lines.push({ type: 'raw', data: '--------------------------------\n' });
  lines.push({ type: 'raw', data: lineWithRight('Subtotal:', `$${fmt(v.total_bruto)}`) + '\n' });

  if (v.total_subsidio && v.total_subsidio > 0) {
    lines.push({ type: 'raw', data: lineWithRight('Subsidio:', `-$${fmt(v.total_subsidio)}`) + '\n' });
  }

  // TOTAL centrado en grande
  lines.push({ type: 'raw', data: '\x1B\x61\x01' }); // centrar
  lines.push({ type: 'raw', data: '\x1B\x21\x30' }); // grande
  lines.push({ type: 'raw', data: `TOTAL A PAGAR\n$${fmt(v.total_neto)}\n` });
  lines.push({ type: 'raw', data: '\x1B\x21\x00' });
  lines.push({ type: 'raw', data: '\x1B\x61\x00' }); // volver a izquierda

  // === MÉTODO DE PAGO ===
  const metodoNombre = (v.metodo_nombre ?? v.metodo_codigo ?? 'DESCONOCIDO').toString();
  lines.push({ type: 'raw', data: '\n' + lineWithRight('Método de pago:', metodoNombre) + '\n' });

  // === EFECTIVO ===
  if (String(v.metodo_codigo ?? metodoNombre).toLowerCase() === 'efectivo') {
    const recibidoRaw = v.efectivo_entregado ?? (v as any).efectivo_recibido ?? (v as any).monto_recibido ?? null;
    const recibido = (recibidoRaw !== null && recibidoRaw !== undefined) ? Number(recibidoRaw) : NaN;
    const cambioRaw = v.cambio ?? (v as any).change ?? null;
    let cambio = (cambioRaw !== null && cambioRaw !== undefined) ? Number(cambioRaw) : NaN;
    if (Number.isNaN(cambio) && !Number.isNaN(recibido) && !Number.isNaN(Number(v.total_neto))) {
      const calc = recibido - Number(v.total_neto);
      cambio = Number.isFinite(calc) ? Number(calc.toFixed(2)) : NaN;
    }
    if (!Number.isNaN(recibido)) {
      lines.push({ type: 'raw', data: lineWithRight('Efectivo:', `$${fmt(recibido)}`) + '\n' });
    }
    if (!Number.isNaN(cambio)) {
      lines.push({ type: 'raw', data: lineWithRight('Cambio:', `$${fmt(cambio)}`) + '\n' });
    }
  }

  // === MONEDERO ===
  if (String(v.metodo_codigo ?? metodoNombre).toLowerCase() === 'monedero') {
    const salAnt = receipt.monedero?.saldo_anterior ?? (v as any).monedero_saldo_anterior ?? 0;
    const salAct = receipt.monedero?.saldo_final ?? (v as any).monedero_saldo_actual ?? 0;
    lines.push({ type: 'raw', data: '--------------------------------\n' });
    lines.push({ type: 'raw', data: lineWithRight('Saldo anterior:', `$${fmt(salAnt)}`) + '\n' });
    lines.push({ type: 'raw', data: lineWithRight('Saldo actual:', `$${fmt(salAct)}`) + '\n' });
  }

  // === PIE FINAL ===
  lines.push({ type: 'raw', data: '\n\n' });
  lines.push({ type: 'raw', data: centerText('www.halucar.es') });
  lines.push({ type: 'raw', data: '\n\n\n\n' });

  // === CORTE FINAL ===
  lines.push({ type: 'raw', data: '\x1D\x56\x01' }); // corte parcial al final
  lines.push({ type: 'raw', data: '\x1B\x70\x00\x64\x64' }); // pulso gaveta

  // === ENVÍO A IMPRESORA ===
  console.log('PrinterService.printReceipt: enviando a impresora', printerName, 'líneas:', lines.length);
  await this.safePrint(config, lines);
}




  
}