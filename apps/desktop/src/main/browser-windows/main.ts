import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { webUrl } from '../utils/web';

// 创建带有原生窗口按钮和可拖动标题栏的桌面窗口。
export const createMainWindow = () => {
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

  // 生产页面使用 HTTPS 来源，由本地协议处理器提供内置资源。
  const pageUrl = is.dev
    ? new URL(process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:3000')
    : webUrl;

  window.loadURL(pageUrl.href).catch(console.error);

  // 站内链接在当前窗口跳转，外部网站交给系统浏览器。
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
