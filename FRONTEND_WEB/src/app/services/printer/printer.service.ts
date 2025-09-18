declare var qz: any;

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrinterService {
    private connected = false;

    /** Asegura que haya una conexión activa con QZ Tray */
    private async ensureConnection(): Promise<void> {
        if (!this.connected && !qz.websocket.isActive()) {
            await qz.websocket.connect();
            this.connected = true;
        }
    }

    async connect(): Promise<void> {
        await this.ensureConnection();
    }

    /** Desconecta del agente QZ Tray */
    async disconnect(): Promise<void> {
        if (this.connected && qz.websocket.isActive()) {
            await qz.websocket.disconnect();
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
        await qz.print(config, data);
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
            { type: 'raw', data: '\x1B\x21\x20TOTAL: $165.00\n' },        // Texto grande
            { type: 'raw', data: '\x1B\x21\x00Gracias por su preferencia\n' },
            { type: 'raw', data: '\x1D\x56\x01' },                         // Corte parcial
            { type: 'raw', data: '\x1B\x70\x00\x64\x64' }                 // Pulso al cajón
        ];

        await qz.print(config, cmds);
    }
}
