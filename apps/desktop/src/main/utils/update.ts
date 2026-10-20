import { is } from '@electron-toolkit/utils';
import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = false;
autoUpdater.setFeedURL(
  'https://gitee.com/yxingyus/ym-video/releases/download/latest',
);

if (is.dev) {
  autoUpdater.forceDevUpdateConfig = true;
}

// 将更新状态通知到应用窗口。
const sendToMainWindow = (channel: string, ...args: unknown[]) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, ...args);
};

autoUpdater.on('update-available', () => {
  autoUpdater.downloadUpdate().catch(console.error);
});

autoUpdater.on('download-progress', (info) => {
  sendToMainWindow('update-progress', info.percent);
});

autoUpdater.on('update-downloaded', () => {
  sendToMainWindow('update-downloaded');
});

autoUpdater.on('error', () => {
  sendToMainWindow('update-error');
});
