import { historySnapshotSchema } from '@ym-video/history';
import type { HistoryErrorType, HistoryOperation } from '@ym-video/history';

type HistoryTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

// 保留 HTTP 错误类别，供历史状态映射统一处理。
export class HistoryServiceError extends Error {
  constructor(readonly type: HistoryErrorType) {
    super(type);
  }
}

// 同源历史接口带会话 Cookie，不在浏览器本地保存认证令牌。
const requestHistory = async (
  transport: HistoryTransport,
  path: string,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await transport(path, {
    credentials: 'include',
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(8_000)])
      : AbortSignal.timeout(8_000),
    keepalive: Boolean(
      init?.body &&
        new TextEncoder().encode(String(init.body)).byteLength < 60_000,
    ),
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  if (!response.ok) {
    // 按响应状态区分账号失效、服务端异常和请求错误。
    let type: HistoryErrorType = 'request';

    if (response.status === 401 || response.status === 403) {
      type = 'unauthorized';
    } else if (response.status >= 500) {
      type = 'server';
    }

    throw new HistoryServiceError(type);
  }
  return response.json();
};

// 回包中的账号也必须匹配，拒绝会话切换期间的旧请求结果。
const fetchHistory = async (
  transport: HistoryTransport,
  ownerId: string,
  signal: AbortSignal,
) => {
  const value = await requestHistory(transport, '/api/v1/history', { signal });
  const result = historySnapshotSchema.safeParse(value);
  if (!result.success || result.data.ownerId !== ownerId) {
    throw new HistoryServiceError('invalid-response');
  }
  return result.data;
};

// 预期账号随操作提交，由服务端与当前会话再次核对。
const syncHistory = async (
  transport: HistoryTransport,
  ownerId: string,
  operations: HistoryOperation[],
  signal: AbortSignal,
) => {
  const value = await requestHistory(transport, '/api/v1/history/sync', {
    method: 'POST',
    signal,
    body: JSON.stringify({ ownerId, operations }),
  });
  const result = historySnapshotSchema.safeParse(value);
  if (!result.success || result.data.ownerId !== ownerId) {
    throw new HistoryServiceError('invalid-response');
  }
  return result.data;
};

// 历史客户端通过统一账号传输访问云端，并维护本机同步队列。
export const createHistoryClient = (transport: HistoryTransport) => ({
  fetchHistory: (ownerId: string, signal: AbortSignal) =>
    fetchHistory(transport, ownerId, signal),
  syncHistory: (
    ownerId: string,
    operations: HistoryOperation[],
    signal: AbortSignal,
  ) => syncHistory(transport, ownerId, operations, signal),
});
