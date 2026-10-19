// 平台源使用受限代理，自定义源使用浏览器直连地址。
export interface Source {
  id: string;
  name: string;
  url?: string;
}

// 用户自行添加并保存在当前浏览器的播放源。
export interface CustomSource extends Source {
  url: string;
}

export type { Episode, HistoryEntry, Movie } from '@ym-video/history';

// 分类父子关系来自资源接口。
export interface Category {
  id: number;
  parentId: number;
  name: string;
}
