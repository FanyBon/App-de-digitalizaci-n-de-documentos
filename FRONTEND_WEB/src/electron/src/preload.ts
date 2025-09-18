import { contextBridge, ipcRenderer } from 'electron';

// Lista blanca para seguridad
const validSendChannels = ['mensaje-desde-renderer'];
const validInvokeChannels = ['get-version', 'get-file-path'];
const validReceiveChannels = ['mensaje-desde-main'];

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, ...args: any[]) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  invoke: (channel: string, ...args: any[]): Promise<any> => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject('Acceso denegado');
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    if (validReceiveChannels.includes(channel)) {
      const subscription = (_: any, ...args: any[]) => listener(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});