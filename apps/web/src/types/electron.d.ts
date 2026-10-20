interface DesktopUpdateCheckResult {
  status: 'up-to-date' | 'downloading' | 'downloaded';
  version: string;
}

interface DesktopIpcBridge {
  getVersion(): Promise<string>;
  // 旧版桌面壳可能尚未提供主题同步接口。
  toggleTheme?(
    mode: 'auto' | 'light' | 'dark',
    resolvedTheme: 'light' | 'dark',
  ): Promise<void>;
  checkForUpdates(): Promise<DesktopUpdateCheckResult>;
  installUpdate(): Promise<void>;
  on(
    channel: 'update-progress',
    listener: (percent: number) => void,
  ): () => void;
  on(
    channel: 'update-downloaded',
    listener: (version: string) => void,
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
