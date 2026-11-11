import type { Episode, Movie } from '@ym-video/history';

export type { Episode, Movie } from '@ym-video/history';

// 影片在同一来源内的稳定标识。
export const movieKey = (sourceId: string, vodId: string) =>
  `${encodeURIComponent(sourceId)}:${encodeURIComponent(vodId)}`;

// 只接受 HTTP 媒体和海报地址。
export const httpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

// 优先选择包含 HLS 的线路，并丢弃无效或危险协议的地址。
export const parseEpisodes = (value: string): Episode[] => {
  const lines = value.split('$$$');
  const selected =
    lines.find((line) => /\.m3u8(?:[?#$]|$)/i.test(line)) ?? lines[0] ?? '';

  return selected.split('#').flatMap((part) => {
    const separator = part.indexOf('$');
    if (separator < 0) {
      return [];
    }

    const url = httpUrl(part.slice(separator + 1).trim());
    return url
      ? [{ label: part.slice(0, separator).trim() || '播放', url }]
      : [];
  });
};

// 影片介绍转为可直接展示的纯文本。
export const plainText = (value: string) =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

// 将综艺更新期数中的连续日期转换为易读格式。
export const formatRemarks = (value: string) =>
  value.replace(/(\d{4})(\d{2})(\d{2})/g, (_, year, month, day) =>
    Number(year) === new Date().getFullYear()
      ? `${month}-${day}`
      : `${year}-${month}-${day}`,
  );

// 影片卡片与历史记录使用统一的播放地址。
export const playerPath = (movie: Pick<Movie, 'sourceId' | 'vodId'>) =>
  `/player/${encodeURIComponent(movie.sourceId)}/${encodeURIComponent(movie.vodId)}`;

// 只接受结构有效的采集站影片记录。
export const parseMovie = (
  value: unknown,
  sourceId: string,
  options: { playUrl?: string } = {},
): Movie | null => {
  if (!isRecord(value) || !['string', 'number'].includes(typeof value.vod_id)) {
    return null;
  }

  const vodId = String(value.vod_id);
  return {
    id: movieKey(sourceId, vodId),
    vodId,
    sourceId,
    name: text(value.vod_name) || '未命名影片',
    pic: httpUrl(text(value.vod_pic)),
    year: text(value.vod_year),
    area: text(value.vod_area),
    lang: text(value.vod_lang),
    category: text(value.type_name),
    remarks: text(value.vod_remarks),
    episodes: parseEpisodes(options.playUrl ?? text(value.vod_play_url)),
  };
};

// 收窄来自上游接口的影片对象与字符串字段。
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === 'string' ? value : '');

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
