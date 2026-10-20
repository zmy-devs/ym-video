import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { is } from '@electron-toolkit/utils';

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
    },
  });

  // 开发模式默认打开独立的开发者工具。
  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' });
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}`);
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // 新窗口链接直接在当前窗口跳转。
  window.webContents.setWindowOpenHandler(({ url }) => {
    window.loadURL(url).catch(console.error);

    return { action: 'deny' };
  });

  return window;
};
