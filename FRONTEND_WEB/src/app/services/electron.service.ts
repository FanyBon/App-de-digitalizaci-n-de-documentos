// src/app/core/services/electron.service.ts
import { Injectable } from '@angular/core';

declare const window: any;

@Injectable({ providedIn: 'root' })
export class ElectronService {
  get isElectron(): boolean {
    return !!window.electronAPI;
  }

  send(channel: string, ...args: any[]): void {
    if (this.isElectron) {
      window.electronAPI.send(channel, ...args);
    }
  }

  invoke<T>(channel: string, ...args: any[]): Promise<T> {
    if (this.isElectron) {
      return window.electronAPI.invoke(channel, ...args);
    }
    return Promise.reject('Electron no disponible');
  }

  on(channel: string, listener: (...args: any[]) => void): () => void {
    if (this.isElectron) {
      return window.electronAPI.on(channel, listener);
    }
    return () => {}; // Función vacía si no está en Electron
  }

  // Método para obtener rutas de archivos en Electron
  async getFilePath(relativePath: string): Promise<string> {
    return this.invoke<string>('get-file-path', relativePath);
  }
}