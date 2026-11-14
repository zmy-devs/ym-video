// 更新任务只区分可检查、下载和安装阶段。
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'installer-opened';

// Android 发布脚本生成的更新清单。
export interface AndroidUpdateManifest {
  version: string;
  url: string;
}

// 两端共用的更新任务，由各自平台处理下载和安装。
export interface ClientUpdate {
  version: string;
  download: (onProgress: (progress: number | null) => void) => Promise<void>;
  install: () => Promise<boolean>;
  close?: () => Promise<void>;
}
