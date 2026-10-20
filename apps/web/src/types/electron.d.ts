interface DesktopIpcBridge {
  getVersion(): Promise<string>;
  // 旧版桌面壳可能尚未提供主题同步接口。
  toggleTheme?(
    mode: 'auto' | 'light' | 'dark',
    resolvedTheme: 'light' | 'dark',
  ): Promise<void>;
  checkForUpdates(): Promise<string | false>;
  installUpdate(): Promise<void>;
  on(
    channel: 'update-progress',
    listener: (event: unknown, percent: number) => void,
  ): () => void;
  on(
    channel: 'update-downloaded',
    listener: (event: unknown) => void,
  ): () => void;
  on(channel: 'update-error', listener: () => void): () => void;
}

// 桌面壳注入的可选桥接需要扩展全局 Window 类型。
declare global {
  interface Window {
    ipc?: DesktopIpcBridge;
  }
}

export {};
