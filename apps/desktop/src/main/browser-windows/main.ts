import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { webUrl } from '../utils/web';

// 影片列表与播放器共用主窗口，关闭后释放原生窗口引用。
let mainWindow: BrowserWindow | undefined;

// 开发连接本地 Web，生产保留站点来源并加载内置页面。
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

// 创建带原生标题栏按钮、预加载和浏览器隔离配置的主窗口。
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

  // 站内新窗口请求回到当前窗口，外部链接交给浏览器。
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Electron 提供已解析的链接，限制允许打开的来源与协议。
    const destination = new URL(url);

    if (destination.origin === pageUrl.origin) {
      window.loadURL(url).catch(console.error);
    } else if (['https:', 'mailto:'].includes(destination.protocol)) {
      shell.openExternal(url).catch(console.error);
    }

    return { action: 'deny' };
  });

  return window;
};

// 再次启动时复用主窗口，已关闭则重新创建。
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
