import { app } from 'electron';
import { createMainWindow } from '@/browser-windows/main';
import '@/utils/update';

// 同时只运行一个桌面实例。
if (!app.requestSingleInstanceLock()) {
  app.exit();
}

app.whenReady().then(() => {
  // 协议处理器就绪后再打开窗口，确保首屏从本地加载。
  const mainWindow = createMainWindow();

  app.on('second-instance', () => {
    mainWindow.show();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
});
