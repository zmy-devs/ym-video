interface DesktopUpdateCheckResult {
  status: 'up-to-date' | 'downloading' | 'downloaded';
  version: string;
}

interface DesktopIpcBridge {
  getVersion(): Promise<string>;
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

interface Window {
  ipc?: DesktopIpcBridge;
}

export {};
