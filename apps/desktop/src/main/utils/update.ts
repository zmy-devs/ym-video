import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

export type UpdateCheckResult =
  | { status: 'up-to-date'; version: string }
  | { status: 'downloading'; version: string }
  | { status: 'downloaded'; version: string };

let updateDownloading = false;
let downloadedVersion: string | undefined;
let availableVersion: string | undefined;
let updateCheckPromise: Promise<UpdateCheckResult> | undefined;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true;
}

const sendUpdateEvent = (channel: string, ...args: unknown[]) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, ...args);
    }
  }
};

autoUpdater.on('download-progress', (progress) => {
  sendUpdateEvent('update-progress', Math.floor(progress.percent));
});

autoUpdater.on('update-downloaded', (info) => {
  updateDownloading = false;
  downloadedVersion = info.version;
  sendUpdateEvent('update-downloaded', info.version);
});

autoUpdater.on('error', () => {
  updateDownloading = false;
  sendUpdateEvent('update-error');
});

const checkForUpdates = async (): Promise<UpdateCheckResult> => {
  if (downloadedVersion) {
    return { status: 'downloaded', version: downloadedVersion };
  }

  if (updateDownloading) {
    return {
      status: 'downloading',
      version: availableVersion ?? app.getVersion(),
    };
  }

  const result = await autoUpdater.checkForUpdates();

  if (!result?.isUpdateAvailable) {
    return { status: 'up-to-date', version: app.getVersion() };
  }

  availableVersion = result.updateInfo.version;
  updateDownloading = true;
  void autoUpdater.downloadUpdate().catch(() => {
    updateDownloading = false;
    sendUpdateEvent('update-error');
  });

  return { status: 'downloading', version: availableVersion };
};

export const updateService = {
  checkForUpdates: () => {
    if (updateCheckPromise) {
      return updateCheckPromise;
    }

    updateCheckPromise = checkForUpdates();
    return updateCheckPromise.finally(() => {
      updateCheckPromise = undefined;
    });
  },
  install: () => {
    if (!downloadedVersion) {
      throw new Error('更新尚未下载完成');
    }

    autoUpdater.quitAndInstall(true, true);
  },
};
