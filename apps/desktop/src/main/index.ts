import { app, BrowserWindow } from 'electron';
import { createMainWindow } from '@/browser-windows/main';
import '@/utils/update';

let mainWindow: BrowserWindow | undefined;

const openMainWindow = () => {
  const window = createMainWindow();
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = undefined;
    }
  });
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(openMainWindow);

  app.on('second-instance', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
