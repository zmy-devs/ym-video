import { app } from 'electron';
import { createMainWindow } from '@/browser-windows/main';
import '@/utils/update';

// 是否成功获取单实例锁
const isPrimaryInstance = app.requestSingleInstanceLock();

if (!isPrimaryInstance) {
  app.exit();
}

app.whenReady().then(() => {
  const mainWindow = createMainWindow();

  app.on('second-instance', () => {
    mainWindow?.show();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
});

