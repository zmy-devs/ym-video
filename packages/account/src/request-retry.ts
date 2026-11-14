import pRetry, { type Options } from 'p-retry';

// 请求重试、退避等待和取消统一交给成熟库处理。
export const retryRequest = <T>(
  request: () => Promise<T>,
  signal: AbortSignal,
  retries = 5,
  options: Pick<Options, 'shouldRetry' | 'minTimeout' | 'maxTimeout'> = {},
) => pRetry(request, { retries, signal, maxTimeout: 5000, ...options });
