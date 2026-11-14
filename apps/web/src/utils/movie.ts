import type { Episode, Movie } from '@ym-video/history';
import { movieSchema } from '../schemas/movie.ts';

// 影片在同一来源内的稳定标识。
export const movieKey = (sourceId: string, vodId: string) =>
  `${encodeURIComponent(sourceId)}:${encodeURIComponent(vodId)}`;

// 优先选择 HLS 线路，保留上游协议和查询参数。
export const parseEpisodes = (value: string): Episode[] => {
  const lines = value.split('$$$');
  const selected =
    lines.find((line) => /\.m3u8(?:[?#$]|$)/i.test(line)) ?? lines[0] ?? '';

  return selected.split('#').flatMap((part) => {
    const separator = part.indexOf('$');
    if (separator < 0) {
      return [];
    }

    const url = part.slice(separator + 1).trim();
    return url
      ? [{ label: part.slice(0, separator).trim() || '播放', url }]
      : [];
  });
};

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
  const result = movieSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  // 已校验的字段直接转换为客户端影片数据。
  const movie = result.data;
  const vodId = movie.vod_id;
  return {
    id: movieKey(sourceId, vodId),
    vodId,
    sourceId,
    name: movie.vod_name || '未命名影片',
    pic: movie.vod_pic,
    year: movie.vod_year,
    area: movie.vod_area,
    lang: movie.vod_lang,
    category: movie.type_name,
    remarks: movie.vod_remarks,
    episodes: parseEpisodes(options.playUrl ?? movie.vod_play_url),
  };
};

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
