// 影片在同一来源内的稳定标识。
export const movieKey = (sourceId: string, vodId: string) =>
  `${encodeURIComponent(sourceId)}:${encodeURIComponent(vodId)}`;

// 跨 Web 与原生页面共享的播放集契约。
export interface Episode {
  label: string;
  url: string;
}

// Web 与原生端共用的采集站影片模型。
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

// 影片描述以纯文本呈现，避免上游 HTML 进入页面。
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
    content: plainText(text(value.vod_content)),
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
