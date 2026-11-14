import { invoke, isTauri } from '@tauri-apps/api/core';

// 浏览器开发页经 Vite 同源转发，原生壳由 Rust 访问本地 API。
const developmentOrigin = isTauri()
  ? 'http://127.0.0.1:8788'
  : window.location.origin;

// 正式构建统一访问已部署的账号服务。
export const apiOrigin = import.meta.env.DEV
  ? developmentOrigin
  : 'https://ym-video.zhangmingyang.dpdns.org';

// 将 Rust 的结构化错误转成已有表单和提示组件可读取的 Error。
const nativeError = (cause: unknown) => {
  if (cause instanceof Error) {
    return cause;
  }

  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    return new Error(String(cause.message));
  }

  return new Error(String(cause));
};

// 页面取消立即结束等待，同时通知 Rust 释放网络请求。
const requestNative = async <T>(
  command: 'request_api' | 'request_resource',
  args: Record<string, unknown>,
  signal?: AbortSignal | null,
): Promise<T> => {
  signal?.throwIfAborted();

  // 请求与取消操作共用的追踪标识。
  const id = crypto.randomUUID();

  // 请求结束时需要解除的取消监听。
  let handleAbort: (() => void) | undefined;

  // 页面取消后立即拒绝的请求结果。
  const aborted = new Promise<never>((_, reject) => {
    handleAbort = () => {
      reject(signal?.reason ?? new DOMException('请求已取消', 'AbortError'));

      invoke('cancel_request', { id }).catch(console.error);
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
  });

  try {
    return await Promise.race([invoke<T>(command, { id, ...args }), aborted]);
  } catch (cause) {
    if (signal?.aborted) {
      throw signal.reason;
    }

    throw nativeError(cause);
  } finally {
    if (handleAbort) {
      signal?.removeEventListener('abort', handleAbort);
    }
  }
};

// 资源源请求独立于账号 API，返回的数据在业务边界继续收窄。
export const requestNativeResource = (url: string, signal?: AbortSignal) =>
  requestNative<unknown>('request_resource', { url }, signal);

// 为 Better Auth 和业务接口提供统一的 Response 契约。
export const apiFetch: typeof fetch = async (input, init) => {
  // 转换为绝对地址后的请求输入。
  const address =
    input instanceof Request ? input : new URL(String(input), apiOrigin);

  // 调用方提供的方法、请求体和取消信号。
  const request = new Request(address, { credentials: 'include', ...init });

  if (!isTauri()) {
    return window.fetch(request);
  }

  // 原生 API 以路径接收请求，来源由原生入口控制。
  const url = new URL(request.url);

  // 本次网络请求返回的响应。
  const response = await requestNative<{
    status: number;
    body: string;
    contentType: string;
  }>(
    'request_api',
    {
      request: {
        path: url.pathname + url.search,
        method: request.method,
        body: ['GET', 'HEAD'].includes(request.method)
          ? null
          : await request.text(),
        contentType: request.headers.get('content-type'),
      },
    },
    request.signal,
  );

  return new Response(
    [204, 205, 304].includes(response.status) ? null : response.body,
    {
      status: response.status,
      headers: { 'content-type': response.contentType },
    },
  );
};
