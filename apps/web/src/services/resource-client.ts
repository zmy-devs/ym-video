import { isTauri, requestDesktopResource } from '@/lib/desktop';
import type { Source } from '../types.ts';
import { builtInSources } from '../lib/built-in-sources.ts';

// 统一客户端从内置配置或自定义源构造完整请求地址。
const buildResourceURL = (source: Source, query: URLSearchParams) => {
  // 自定义源优先使用用户保存的地址。
  const baseUrl = source.url
    ? source.url
    : builtInSources.find((item) => item.id === source.id)?.url;

  if (!baseUrl) {
    throw new Error('资源源不存在');
  }

  // 合并分类、搜索或详情查询条件。
  const url = new URL(baseUrl);

  query.forEach((value, key) => url.searchParams.set(key, value));

  return url.href;
};

// 资源源始终由客户端直接访问，不再经过 API Worker 代理。
export const requestResource = async (
  source: Source,
  query: URLSearchParams,
  signal?: AbortSignal,
): Promise<unknown> => {
  if (isTauri()) {
    return requestDesktopResource(buildResourceURL(source, query), signal);
  }

  // 原生请求使用完整上游地址，浏览器开发页使用本地转发地址。
  let url = new URL(buildResourceURL(source, query));

  if (window.location.protocol === 'https:' && url.protocol === 'http:') {
    throw new Error('当前页面使用 HTTPS，请填写 HTTPS 接口地址');
  }

  // 浏览器开发页通过 Vite 本地转发访问不返回 CORS 头的资源源。
  if (import.meta.env.DEV) {
    const target = url.href;

    url = new URL('/__ym_resource_proxy', window.location.origin);
    url.searchParams.set('url', target);
  }

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

    return await response.json();
  } catch (cause) {
    if (signal?.aborted) {
      throw cause;
    }

    if (requestSignal.aborted) {
      throw new Error('接口请求超时，请稍后重试');
    }

    if (cause instanceof SyntaxError) {
      throw new Error('接口未返回有效的 JSON 数据');
    }

    if (cause instanceof TypeError) {
      throw new Error('无法访问接口，请检查地址、网络或接口的跨域设置');
    }

    throw cause;
  }
};
