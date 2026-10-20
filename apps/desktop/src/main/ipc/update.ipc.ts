import { autoUpdater } from 'electron-updater';

// 检查更新，返回可用版本或 false。
export const checkForUpdates = async () => {
  const result = await autoUpdater.checkForUpdates();

  return result?.isUpdateAvailable ? result.updateInfo.version : false;
};

// 安装已下载的更新并重启应用。
export const installUpdate = () => {
  autoUpdater.quitAndInstall(true, true);
};
