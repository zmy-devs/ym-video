export type { Episode, Movie, HistoryEntry } from '@ym-video/history';

// 客户端播放源的名称、标识和接口地址。
export interface Source {
  id: string;
  name: string;
  url?: string;
}

// 自定义播放源在当前设备保存完整接口地址。
export interface CustomSource extends Source {
  url: string;
}

// 采集站返回的父子分类关系。
export interface Category {
  id: number;
  parentId: number;
  name: string;
}
