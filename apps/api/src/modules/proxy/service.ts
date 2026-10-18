import { HttpError } from '../../errors';
import { proxySources } from './targets';

const maxResponseBytes = 2 * 1024 * 1024;
const timeoutMilliseconds = 10_000;

export const buildProxyURL = (sourceId: string, query: URLSearchParams) => {
  const source = proxySources.find((item) => item.id === sourceId);
  if (!source) throw new HttpError(404, 'UNKNOWN_SOURCE', '资源源不存在');

  const target = new URL(source.url);
  const validators: Record<string, (value: string) => boolean> = {
    ac: (value) => ['list', 'detail'].includes(value),
    pg: (value) => /^[1-9]\d{0,3}$/.test(value),
    t: (value) => /^\d{1,10}$/.test(value),
    ids: (value) => /^\d{1,12}(,\d{1,12}){0,99}$/.test(value),
    wd: (value) =>
      value.trim().length > 0 &&
      value.length <= 200 &&
      !/[\u0000-\u001f]/.test(value),
  };
  for (const [key, value] of query) {
    const validate = Object.hasOwn(validators, key)
      ? validators[key]
      : undefined;
    if (!validate || !validate(value) || query.getAll(key).length !== 1) {
      throw new HttpError(400, 'INVALID_QUERY', '代理参数不正确或不受支持');
    }
    target.searchParams.set(key, value);
  }
  return target;
};

const readJSON = async (response: Response) => {
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxResponseBytes) {
    await response.body?.cancel();
    throw new HttpError(502, 'UPSTREAM_TOO_LARGE', '资源接口响应过大');
  }
  if (!response.body)
    throw new HttpError(
      502,
      'UPSTREAM_INVALID_JSON',
      '资源接口未返回有效 JSON',
    );

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxResponseBytes) {
        await reader.cancel();
        throw new HttpError(502, 'UPSTREAM_TOO_LARGE', '资源接口响应过大');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes).replace(/^\uFEFF/, '');
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== 'object')
      throw new Error('Invalid resource response');
  } catch {
    throw new HttpError(
      502,
      'UPSTREAM_INVALID_JSON',
      '资源接口未返回有效 JSON',
    );
  }
  return text;
};

export const forwardResource = async (
  sourceId: string,
  query: URLSearchParams,
) => {
  const target = buildProxyURL(sourceId, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'manual',
      signal: controller.signal,
    });
    // 目标地址固定在服务端；拒绝跳转，防止上游重定向到未授权地址。
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new HttpError(
        502,
        'UPSTREAM_REDIRECT',
        '资源接口发生未经允许的重定向',
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new HttpError(502, 'UPSTREAM_ERROR', '资源接口暂时不可用');
    }
    return await readJSON(response);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (controller.signal.aborted)
      throw new HttpError(504, 'UPSTREAM_TIMEOUT', '资源接口请求超时');
    throw new HttpError(502, 'UPSTREAM_ERROR', '资源接口暂时不可用');
  } finally {
    clearTimeout(timer);
  }
};
