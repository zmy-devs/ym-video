import type { Movie } from '../types.ts';

export {
  formatRemarks,
  httpUrl,
  movieKey,
  parseEpisodes,
  plainText,
} from '@ym-video/catalog';

// 路由不携带影片对象，保证刷新与直接访问可恢复。
export const playerPath = (movie: Pick<Movie, 'sourceId' | 'vodId'>) =>
  `/player/${encodeURIComponent(movie.sourceId)}/${encodeURIComponent(movie.vodId)}`;

// 只复用明确完结且包含有效选集的影片，状态不明时继续检查更新。
export const isMovieComplete = (movie: Pick<Movie, 'remarks' | 'episodes'>) => {
  // 完结标记来自播放源备注，不根据观看进度或当前集数猜测。
  const remarks = movie.remarks.trim();

  if (!movie.episodes.length) {
    return false;
  }

  if (/^(?:第?\s*\d+\s*集\s*)?(?:已?完结|已完|大结局|全集)$/.test(remarks)) {
    return true;
  }

  // “全 N 集”仅在本地选集确实齐全时作为完结依据。
  const total = /^全\s*(\d+)\s*集$/.exec(remarks);

  return (
    total !== null &&
    Number(total[1]) > 0 &&
    movie.episodes.length >= Number(total[1])
  );
};

// 格式化播放器中的时长。
export const formatTime = (seconds: number) => {
  // 用于显示的非负整数秒数。
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;

  // 按时、分、秒顺序组织的时间。
  const parts = [Math.floor(total / 60), total % 60];
  if (total >= 3600) {
    parts.splice(0, 1, Math.floor(total / 3600), Math.floor(total / 60) % 60);
  }
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
};
