"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Solo en desarrollo; en producción se recomienda activarlas
            allowRunningInsecureContent: true,
            // preload: path.join(__dirname, 'preload.js'),
        },
    });
    // Asigna el título a la ventana
    win.setTitle("PROCOMIN - Control de Comidas");
    // Abre DevTools para depuración
    win.webContents.openDevTools();
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
        win.loadURL('http://localhost:4200');
    }
    else {
        const indexPath = electron_1.app.isPackaged
            ? path.join(process.resourcesPath, 'dist', 'frontend-web', 'browser', 'index.html')
            : path.join(__dirname, '..', '..', '..', 'dist', 'frontend-web', 'browser', 'index.html');
        console.log('Cargando archivo (prod):', indexPath);
        win.loadFile(indexPath)
            .then(() => {
            console.log('index.html cargado correctamente.');
            win.webContents.on('will-navigate', (event, url) => {
                console.log('will-navigate detectado:', url);
                if (!url.includes('index.html')) {
                    event.preventDefault();
                    console.log(`Interceptado intento de navegación a ${url} - recargando index.html`);
                    win.loadFile(indexPath).catch((err) => console.error('Error al recargar index.html:', err));
                }
            });
            win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
                console.error('did-fail-load:', errorCode, errorDescription, validatedURL);
                if (isMainFrame && errorCode === -6 && !validatedURL.includes('index.html')) {
                    console.log('Error principal de carga; recargando index.html');
                    win.loadFile(indexPath).catch((err) => console.error('Error al intentar recargar index.html:', err));
                }
            });
            win.webContents.session.webRequest.onBeforeRequest({ urls: ['file://*/*'] }, (details, callback) => {
                console.log('onBeforeRequest:', details.url);
                if (details.resourceType === 'mainFrame' && !details.url.includes('index.html')) {
                    console.log(`Redirigiendo ${details.url} a index.html`);
                    callback({ redirectURL: `file://${indexPath}` });
                }
                else {
                    callback({});
                }
            });
        })
            .catch((err) => {
            console.error('Error al cargar index.html:', err);
        });
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map