import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedUrl, webUrl } from '@/utils/web';

// 断网重试页的打包路径。
const offlinePagePath = join(__dirname, '../renderer/index.html');
// 断网重试页对应的本地 URL。
const offlinePageUrl = pathToFileURL(offlinePagePath);

const openExternalUrl = (value: string) => {
  try {
    const destination = new URL(value);
    if (!['https:', 'mailto:'].includes(destination.protocol)) {
      return;
    }

    void shell.openExternal(value).catch(() => undefined);
  } catch {
    // Ignore malformed navigation targets.
  }
};

// 判断目标是否指向本地断网重试页。
const isOfflinePageUrl = (value: string) => {
  try {
    const destination = new URL(value);
    const rendererUrl = process.env.ELECTRON_RENDERER_URL;

    if (rendererUrl) {
      const renderer = new URL(rendererUrl);
      return (
        destination.origin === renderer.origin &&
        destination.pathname === renderer.pathname
      );
    }

    return (
      destination.protocol === offlinePageUrl.protocol &&
      destination.pathname === offlinePageUrl.pathname
    );
  } catch {
    return false;
  }
};

// 判断目标是否允许留在应用窗口内导航。
const isApplicationUrl = (value: string) => {
  return isTrustedUrl(value) || isOfflinePageUrl(value);
};

// 远程站点不可用时加载本地重试页。
const loadOfflinePage = (window: BrowserWindow) => {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    const pageUrl = new URL(rendererUrl);
    pageUrl.searchParams.set('retry', webUrl.href);
    return window.loadURL(pageUrl.href);
  }

  return window.loadFile(offlinePagePath, {
    query: { retry: webUrl.href },
  });
};

export const createMainWindow = () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.on('will-navigate', (event, destination) => {
    if (isApplicationUrl(destination)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(destination);
  });

  window.webContents.on('will-redirect', (event, destination) => {
    if (!isApplicationUrl(destination)) {
      event.preventDefault();
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isApplicationUrl(url)) {
      void window.loadURL(url).catch(() => undefined);
    } else {
      openExternalUrl(url);
    }

    return { action: 'deny' };
  });

  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, _errorDescription, failedUrl, isMainFrame) => {
      if (
        !isMainFrame ||
        errorCode === -3 ||
        !isTrustedUrl(failedUrl) ||
        window.isDestroyed()
      ) {
        return;
      }

      void loadOfflinePage(window).catch(() => undefined);
    },
  );

  void window.loadURL(webUrl.href).catch(() => undefined);
  return window;
};
