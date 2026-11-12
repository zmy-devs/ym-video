// 两端共用的更新任务，由各自平台处理下载和安装。
export interface ClientUpdate {
  version: string;
  body: string;
  download: (onProgress: (progress: number | null) => void) => Promise<void>;
  install: () => Promise<boolean>;
  close?: () => Promise<void>;
}
