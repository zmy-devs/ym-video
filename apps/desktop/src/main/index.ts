import { app } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'node:path';
import { createMainWindow } from '@/browser-windows/main';
import { registerWebProtocol } from '@/utils/web-protocol';
import { webUrl } from '@/utils/web';
import '@/utils/update';

// 同时只运行一个桌面实例。
if (!app.requestSingleInstanceLock()) {
  app.exit();
}

app.whenReady().then(() => {
  if (!is.dev) {
    registerWebProtocol(webUrl, join(__dirname, '../renderer'));
  }

  // 协议处理器就绪后再打开窗口，确保首屏从本地加载。
  const mainWindow = createMainWindow();

  app.on('second-instance', () => {
    mainWindow.show();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
});
