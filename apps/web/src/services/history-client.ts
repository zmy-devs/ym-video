import { historySnapshotSchema } from '@ym-video/history';
import type { HistoryErrorType, HistoryOperation } from '@ym-video/history';
import { retryRequest } from '@ym-video/account/request-retry';

// 历史请求复用浏览器或原生壳提供的 Fetch 传输。
type HistoryTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

// 永久失败直接反馈，临时 HTTP 错误允许重试。
export class HistoryServiceError extends Error {
  readonly type: HistoryErrorType;
  readonly retryable: boolean;

  constructor(type: HistoryErrorType, retryable = false) {
    super(type);
    this.type = type;
    this.retryable = retryable;
  }
}

// 读写共用一个网络边界，每次尝试重新计时并解析返回快照。
const requestHistory = (
  transport: HistoryTransport,
  ownerId: string,
  path: string,
  signal: AbortSignal,
  body?: string,
) =>
  retryRequest(
    async () => {
      const response = await transport(path, {
        method: body ? 'POST' : 'GET',
        credentials: 'include',
        body,
        signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
        headers: body ? { 'content-type': 'application/json' } : undefined,
      });

      if (!response.ok) {
        // 账号冲突结束当前上传，数据写入冲突允许重试同一批操作。
        if (response.status === 409) {
          const error: { code: string } = await response.json();
          throw new HistoryServiceError(
            'request',
            error.code === 'HISTORY_CONFLICT',
          );
        }

        if (response.status === 401 || response.status === 403) {
          throw new HistoryServiceError('unauthorized');
        }

        throw new HistoryServiceError(
          response.status >= 500 ? 'server' : 'request',
          response.status >= 500 ||
            response.status === 408 ||
            response.status === 429,
        );
      }

      const result = historySnapshotSchema.safeParse(await response.json());
      if (!result.success || result.data.ownerId !== ownerId) {
        throw new HistoryServiceError('invalid-response');
      }
      return result.data;
    },
    signal,
    5,
    {
      shouldRetry: ({ error }) =>
        !(error instanceof HistoryServiceError) || error.retryable,
    },
  );

// POST 请求体在重试前固定，重复上传沿用原有操作标识。
export const createHistoryClient = (transport: HistoryTransport) => ({
  fetchHistory: (ownerId: string, signal: AbortSignal) =>
    requestHistory(transport, ownerId, '/api/v1/history', signal),
  syncHistory: (
    ownerId: string,
    operations: HistoryOperation[],
    signal: AbortSignal,
  ) =>
    requestHistory(
      transport,
      ownerId,
      '/api/v1/history/sync',
      signal,
      JSON.stringify({ ownerId, operations }),
    ),
});
