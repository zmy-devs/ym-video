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

// 主窗口与播放窗口共享同一更新任务，均需收到状态变化。
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
