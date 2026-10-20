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
