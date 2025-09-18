import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,  // Solo en desarrollo; en producción se recomienda activarlas
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
  } else {
    const indexPath = app.isPackaged
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
            win.loadFile(indexPath).catch((err) =>
              console.error('Error al recargar index.html:', err)
            );
          }
        });

        win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
          console.error('did-fail-load:', errorCode, errorDescription, validatedURL);
          if (isMainFrame && errorCode === -6 && !validatedURL.includes('index.html')) {
            console.log('Error principal de carga; recargando index.html');
            win.loadFile(indexPath).catch((err) =>
              console.error('Error al intentar recargar index.html:', err)
            );
          }
        });

        win.webContents.session.webRequest.onBeforeRequest(
          { urls: ['file://*/*'] },
          (details, callback) => {
            console.log('onBeforeRequest:', details.url);
            if (details.resourceType === 'mainFrame' && !details.url.includes('index.html')) {
              console.log(`Redirigiendo ${details.url} a index.html`);
              callback({ redirectURL: `file://${indexPath}` });
            } else {
              callback({});
            }
          }
        );
      })
      .catch((err) => {
        console.error('Error al cargar index.html:', err);
      });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
