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

// 将更新任务的状态变化发送给当前应用窗口。
const sendToWindows = (channel: string, ...args: unknown[]) => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, ...args);
  }
};

autoUpdater.on('update-available', () => {
  autoUpdater.downloadUpdate().catch(console.error);
});

autoUpdater.on('download-progress', (info) => {
  sendToWindows('update-progress', info.percent);
});

autoUpdater.on('update-downloaded', () => {
  sendToWindows('update-downloaded');
});

autoUpdater.on('error', () => {
  sendToWindows('update-error');
});
