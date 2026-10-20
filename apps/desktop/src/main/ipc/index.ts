import {
  app,
  BrowserWindow,
  nativeTheme,
  type IpcMainInvokeEvent,
} from 'electron';

export const getVersion = () => {
  return app.getVersion();
};

// 将 Web 的主题模式同步到原生控件、窗口按钮和背景。
export const toggleTheme = (
  { sender }: IpcMainInvokeEvent,
  theme: 'auto' | 'light' | 'dark',
  resolvedTheme: 'light' | 'dark',
) => {
  // 发起主题切换的窗口
  const win = BrowserWindow.fromWebContents(sender)!;

  nativeTheme.themeSource = theme === 'auto' ? 'system' : theme;

  win.setTitleBarOverlay({
    symbolColor: resolvedTheme === 'light' ? '#000000' : '#ffffff',
  });
};
