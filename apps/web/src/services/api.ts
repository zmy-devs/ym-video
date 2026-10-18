import type { Category, Movie, Source } from '@/types';
import { httpUrl, movieKey, parseEpisodes, plainText } from '@/lib/movie';

// 收窄来自上游和本地存储的未知对象。
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 将上游字符串字段统一转为安全文本。
const text = (value: unknown) => (typeof value === 'string' ? value : '');

// 所有业务请求均通过同源受限 API，不接受目标 URL。
const request = async (
  path: string,
  signal?: AbortSignal,
): Promise<unknown> => {
  // 同源 API 返回的 HTTP 响应。
  const response = await fetch(path, { credentials: 'include', signal });
  if (!response.ok) {
    // 尚未信任的接口响应数据。
    const body: unknown = await response.json().catch(() => null);

    // 服务端返回的错误说明。
    const message = isRecord(body) ? text(body.message) : '';
    throw new Error(message || `请求失败（${response.status}），请稍后重试`);
  }
  return response.json();
};

// 获取可用源，以服务端配置为准。
export const getSources = async (): Promise<Source[]> => {
  // 尚未信任的接口响应数据。
  const body = await request('/api/v1/proxy/sources');
  if (!isRecord(body) || !Array.isArray(body.sources)) {
    throw new Error('资源源列表格式错误');
  }
  return body.sources.flatMap((item: unknown) =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
      ? [{ id: item.id, name: item.name }]
      : [],
  );
};

// 转换影片时捕获请求所属源，避免切源后的结果被错误标记。
const parseMovie = (value: unknown, sourceId: string): Movie | null => {
  if (!isRecord(value) || !['string', 'number'].includes(typeof value.vod_id)) {
    return null;
  }
  // 上游影片 ID，与源 ID 共同标识影片。
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
    episodes: parseEpisodes(text(value.vod_play_url)),
  };
};

// 查询最新、分类、关键词或指定影片，空参数不进入 URL。
export const getMovies = async (
  sourceId: string,
  query: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
) => {
  // 受限资源接口的查询参数。
  const params = new URLSearchParams({ ac: 'detail' });
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  // 尚未信任的接口响应数据。
  const body = await request(
    `/api/v1/proxy/${encodeURIComponent(sourceId)}?${params}`,
    signal,
  );
  if (!isRecord(body) || !Array.isArray(body.list)) {
    throw new Error('影片列表格式错误，请切换资源源');
  }
  // 当前查询已加载的影片列表。
  const movies = body.list.flatMap((item: unknown) => {
    // 接口转换后的有效影片。
    const movie = parseMovie(item, sourceId);
    return movie ? [movie] : [];
  });

  // 可用数据的总页数。
  const pageCount = Number(body.pagecount);
  return {
    movies,
    pageCount: Number.isFinite(pageCount) ? Math.max(0, pageCount) : 0,
  };
};

// 查询分类，父 ID 为零的分类用于侧边栏。
export const getCategories = async (
  sourceId: string,
  signal?: AbortSignal,
): Promise<Category[]> => {
  // 尚未信任的接口响应数据。
  const body = await request(
    `/api/v1/proxy/${encodeURIComponent(sourceId)}`,
    signal,
  );
  if (!isRecord(body) || !Array.isArray(body.class)) {
    throw new Error('分类数据格式错误');
  }
  return body.class.flatMap((item: unknown) => {
    if (
      !isRecord(item) ||
      !Number.isFinite(Number(item.type_id)) ||
      !Number.isFinite(Number(item.type_pid))
    ) {
      return [];
    }
    return [
      {
        id: Number(item.type_id),
        parentId: Number(item.type_pid),
        name: text(item.type_name),
      },
    ];
  });
};
