import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { webUrl } from '../utils/web';

// 主窗口与播放器窗口分别管理，关闭后释放原生窗口引用。
let mainWindow: BrowserWindow | undefined;

// 同时只保留一个播放窗口，切换影片时复用。
let playerWindow: BrowserWindow | undefined;

// 开发和生产窗口使用相同来源，共享登录态与本地观看历史。
const pageUrl = is.dev
  ? new URL(process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:3000')
  : webUrl;

// 唤起已有窗口时先还原最小化状态。
const showWindow = (window: BrowserWindow) => {
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
};

// 主窗口与播放窗口复用标题栏、预加载和浏览器隔离配置。
const createWindow = (url: URL) => {
  // 桌面窗口保留原生标题栏按钮，页面使用 Web 应用。
  const window = new BrowserWindow({
    width: 1280,
    height: 800,

    minWidth: 800,
    minHeight: 600,

    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0,0,0,0)',
      height: 40,
    },

    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 开发模式默认打开独立的开发者工具。
  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  window.loadURL(url.href).catch(console.error);

  // 播放链接交给独立窗口，其他站内链接保留导航，外部链接交给浏览器。
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Electron 提供已解析的链接，限制允许打开的来源与协议。
    const destination = new URL(url);

    if (destination.origin === pageUrl.origin) {
      if (/^\/player\/[^/]+\/[^/]+\/?$/.test(destination.pathname)) {
        openPlayerWindow(destination);
      } else {
        window.loadURL(url).catch(console.error);
      }
    } else if (['https:', 'mailto:'].includes(destination.protocol)) {
      shell.openExternal(url).catch(console.error);
    }

    return { action: 'deny' };
  });

  return window;
};

// 播放窗口返回主页时唤起原列表，并关闭播放器以释放媒体。
const openPlayerWindow = (url: URL) => {
  if (playerWindow && !playerWindow.isDestroyed()) {
    if (
      playerWindow.webContents.getURL() !== url.href ||
      url.searchParams.get('restart') === '1'
    ) {
      playerWindow.loadURL(url.href).catch(console.error);
    }

    showWindow(playerWindow);
    return;
  }

  // 播放窗口拥有同样的 IPC 与默认会话，不依赖主窗口的生命周期。
  const window = createWindow(url);
  playerWindow = window;

  window.on('closed', () => {
    playerWindow = undefined;
  });

  window.webContents.on(
    'did-navigate-in-page',
    (_event, address, isMainFrame) => {
      // Vue 返回主页完成后再关闭，确保路由离开前的进度已保存。
      const destination = new URL(address);

      if (
        isMainFrame &&
        destination.origin === pageUrl.origin &&
        destination.pathname === '/overview'
      ) {
        createMainWindow();
        window.close();
      }
    },
  );
};

// 再次启动或从播放器返回时复用主窗口，已关闭则重新创建。
export const createMainWindow = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showWindow(mainWindow);
    return mainWindow;
  }

  // 主窗口始终从应用入口打开，由 Web 路由恢复登录或影片列表。
  const window = createWindow(pageUrl);
  mainWindow = window;

  window.on('closed', () => {
    mainWindow = undefined;
  });

  return window;
};
