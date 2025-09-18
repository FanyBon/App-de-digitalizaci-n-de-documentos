"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Lista blanca para seguridad
const validSendChannels = ['mensaje-desde-renderer'];
const validInvokeChannels = ['get-version', 'get-file-path'];
const validReceiveChannels = ['mensaje-desde-main'];
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, ...args) => {
        if (validSendChannels.includes(channel)) {
            electron_1.ipcRenderer.send(channel, ...args);
        }
    },
    invoke: (channel, ...args) => {
        if (validInvokeChannels.includes(channel)) {
            return electron_1.ipcRenderer.invoke(channel, ...args);
        }
        return Promise.reject('Acceso denegado');
    },
    on: (channel, listener) => {
        if (validReceiveChannels.includes(channel)) {
            const subscription = (_, ...args) => listener(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            return () => electron_1.ipcRenderer.removeListener(channel, subscription);
        }
    }
});
//# sourceMappingURL=preload.js.map