import type { Category, Source } from '@/types';
import { parseMovie } from '@ym-video/catalog';
import { proxySources } from '@ym-video/catalog/proxy';
import { normalizeSourceUrl, parseCategories } from '@/lib/source';

// 收窄来自上游和本地存储的未知对象。
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 将上游字符串字段统一转为安全文本。
const text = (value: unknown) => (typeof value === 'string' ? value : '');

// 桌面从内置配置或自定义源构造完整请求地址。
const buildResourceURL = (source: Source, query: URLSearchParams) => {
  // 自定义源优先使用用户保存的地址。
  const baseUrl = source.url
    ? normalizeSourceUrl(source.url)
    : proxySources.find((item) => item.id === source.id)?.url;

  if (!baseUrl) {
    throw new Error('资源源不存在');
  }

  // 合并分类、搜索或详情查询条件。
  const url = new URL(baseUrl);

  query.forEach((value, key) => url.searchParams.set(key, value));

  return url.href;
};

// 平台业务请求通过同源受限 API。
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

// 桌面资源优先走本地 Node，浏览器保留平台代理与自定义源直连。
const requestResource = async (
  source: Source,
  query: URLSearchParams,
  signal?: AbortSignal,
): Promise<unknown> => {
  // 旧版桌面壳未提供资源代理时继续走浏览器逻辑。
  const ipc = window.ipc;

  if (ipc?.requestResource) {
    // 桌面 IPC 只传完整 URL，主进程直接 fetch。
    return ipc.requestResource(buildResourceURL(source, query));
  }

  // 普通浏览器的内置源继续走现有服务端代理。
  if (!source.url) {
    return request(
      `/api/v1/proxy/${encodeURIComponent(source.id)}?${query}`,
      signal,
    );
  }

  // 浏览器自定义源直连时不携带会话，并保留现有跨域错误提示。
  const url = new URL(normalizeSourceUrl(source.url));

  if (window.location.protocol === 'https:' && url.protocol === 'http:') {
    throw new Error('当前页面使用 HTTPS，请填写 HTTPS 接口地址');
  }

  query.forEach((value, key) => url.searchParams.set(key, value));

  // 超时同样覆盖响应体读取，关闭弹窗或切源可主动取消。
  const requestSignal = AbortSignal.any([
    AbortSignal.timeout(10_000),
    ...(signal ? [signal] : []),
  ]);

  try {
    // 自定义接口响应不附带 Cookie，也不透传页面地址。
    const response = await fetch(url, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: requestSignal,
    });

    if (!response.ok) {
      throw new Error(`接口请求失败（${response.status}）`);
    }

    try {
      return await response.json();
    } catch (cause) {
      if (requestSignal.aborted) {
        throw cause;
      }

      throw new Error('接口未返回有效的 JSON 数据');
    }
  } catch (cause) {
    if (signal?.aborted) {
      throw cause;
    }

    if (requestSignal.aborted) {
      throw new Error('接口请求超时，请稍后重试');
    }

    if (cause instanceof TypeError) {
      throw new Error('无法访问接口，请检查地址、网络或接口的跨域设置');
    }

    throw cause;
  }
};

// 桌面从本地读取共用配置，浏览器从服务端获取可用源。
export const getSources = async (): Promise<Source[]> => {
  if (window.ipc?.requestResource) {
    return proxySources.map(({ id, name }) => ({ id, name }));
  }

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

// 查询最新、分类、关键词或指定影片，空参数不进入 URL。
export const getMovies = async (
  source: Source,
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
  const body = await requestResource(source, params, signal);
  if (!isRecord(body) || !Array.isArray(body.list)) {
    throw new Error('影片列表格式错误，请切换资源源');
  }
  // 当前查询已加载的影片列表。
  const movies = body.list.flatMap((item: unknown) => {
    // 接口转换后的有效影片。
    const movie = parseMovie(item, source.id);
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
  source: Source,
  signal?: AbortSignal,
): Promise<Category[]> => {
  // 尚未信任的接口响应数据。
  const body = await requestResource(
    source,
    new URLSearchParams({ ac: 'list' }),
    signal,
  );

  return parseCategories(body);
};
