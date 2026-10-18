// 服务端允许的资源源，不向客户端暴露上游请求地址。
export interface Source {
  id: string;
  name: string;
}

// 一集对应一个可直接播放的媒体地址。
export interface Episode {
  label: string;
  url: string;
}

// 浏览器端影片模型，使用源 ID 与影片 ID 共同标识。
export interface Movie {
  id: string;
  vodId: string;
  sourceId: string;
  name: string;
  pic: string;
  content: string;
  year: string;
  area: string;
  lang: string;
  category: string;
  remarks: string;
  episodes: Episode[];
}

// 分类父子关系来自资源接口。
export interface Category {
  id: number;
  parentId: number;
  name: string;
}

// 每集播放进度独立保存，允许从头播放与主动回看。
export interface Progress {
  currentTime: number;
  duration: number;
}

// 历史仅保存在当前浏览器，不与登录账号绑定。
export interface HistoryEntry extends Movie {
  episode: number;
  progress: Record<string, Progress>;
  watchedAt: number;
}
