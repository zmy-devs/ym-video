import type { Episode, Movie } from '../types.ts';

// 确保不同资源源中的同号影片不会覆盖。
export const movieKey = (sourceId: string, vodId: string) =>
  `${encodeURIComponent(sourceId)}:${encodeURIComponent(vodId)}`;

// 只接受 HTTP 媒体和海报地址。
export const httpUrl = (value: string) => {
  try {
    // 经过协议验证的媒体地址。
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

// 按播放线路拆分，优先选择包含 HLS 的线路。
export const parseEpisodes = (value: string): Episode[] => {
  // 上游提供的独立播放线路。
  const lines = value.split('$$$');

  // 优先使用的 HLS 播放线路。
  const selected =
    lines.find((line) => /\.m3u8(?:[?#$]|$)/i.test(line)) ?? lines[0] ?? '';
  return selected.split('#').flatMap((part) => {
    // 集名与媒体 URL 之间的分隔位置。
    const separator = part.indexOf('$');
    if (separator < 0) {
      return [];
    }
    // 经过协议验证的媒体地址。
    const url = httpUrl(part.slice(separator + 1).trim());
    return url
      ? [{ label: part.slice(0, separator).trim() || '播放', url }]
      : [];
  });
};

// 影片描述作为纯文本呈现，避免上游 HTML 进入页面。
export const plainText = (value: string) =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

// 路由不携带影片对象，保证刷新与直接访问可恢复。
export const playerPath = (movie: Pick<Movie, 'sourceId' | 'vodId'>) =>
  `/player/${encodeURIComponent(movie.sourceId)}/${encodeURIComponent(movie.vodId)}`;

// 与桌面端一致，将综艺更新期数中的连续日期转换为易读格式。
export const formatRemarks = (value: string) =>
  value.replace(/(\d{4})(\d{2})(\d{2})/g, (_, year, month, day) =>
    Number(year) === new Date().getFullYear()
      ? `${month}-${day}`
      : `${year}-${month}-${day}`,
  );

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
