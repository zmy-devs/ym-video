import {
  emptyHistory,
  isHistoryOperation,
  isHistorySnapshot,
  mergeHistorySnapshots,
} from '@ym-video/history';
import type { HistoryOperation, HistorySnapshot } from '@ym-video/history';

// 云端确认快照按账号隔离。
interface CachedHistory {
  ownerId: string;
  snapshot: HistorySnapshot;
}

// 持久化序号保证同毫秒的删除、清空和重开仍按因果顺序上传。
interface QueuedOperation {
  key: string;
  ownerId: string;
  order: number;
  operation: HistoryOperation;
}

// IndexedDB 数据读取时校验账号、键与队列序号。
const isQueuedOperation = (value: unknown): value is QueuedOperation =>
  typeof value === 'object' &&
  value !== null &&
  'key' in value &&
  typeof value.key === 'string' &&
  'ownerId' in value &&
  typeof value.ownerId === 'string' &&
  'operation' in value &&
  isHistoryOperation(value.operation) &&
  value.key === operationKey(value.ownerId, value.operation.id) &&
  'order' in value &&
  typeof value.order === 'number' &&
  Number.isSafeInteger(value.order) &&
  value.order >= 0;

// 缓存损坏时回退空快照，绝不混用另一个账号的数据。
const readSnapshot = (value: unknown, ownerId: string): HistorySnapshot => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'ownerId' in value &&
    value.ownerId === ownerId &&
    'snapshot' in value &&
    isHistorySnapshot(value.snapshot) &&
    value.snapshot.ownerId === ownerId
  ) {
    return value.snapshot;
  }
  return emptyHistory(ownerId);
};

// 原始队列逐项检查，保留有效的当前账号操作。
const readQueuedOperations = (value: unknown, ownerId: string) =>
  Array.isArray(value)
    ? value.filter(isQueuedOperation).filter((item) => item.ownerId === ownerId)
    : [];

// 本机恢复结果同时包含快照和仍待上传的操作。
type LocalHistory = {
  snapshot: HistorySnapshot;
  operations: HistoryOperation[];
};

// 共享连接，升级或打开失败后允许重新建立。
let database: Promise<IDBDatabase> | undefined;

// 建立账号缓存和操作队列所需的存储。
const openDatabase = () => {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('ym-video-web', 3);
      let blocked = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('history-cache')) {
          db.createObjectStore('history-cache', { keyPath: 'ownerId' });
        }
        if (!db.objectStoreNames.contains('history-operations')) {
          const operations = db.createObjectStore('history-operations', {
            keyPath: 'key',
          });
          operations.createIndex('ownerId', 'ownerId');
        }
      };
      request.onsuccess = () => {
        if (blocked) {
          request.result.close();
          return;
        }
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        blocked = true;
        reject(new Error('请关闭其他旧版页面后重试'));
      };
    });
    database.catch(() => {
      database = undefined;
    });
  }
  return database;
};

// 只有 IndexedDB 事务完成后，调用方才认为数据已保存。
const transaction = <T>(
  stores: string[],
  mode: IDBTransactionMode,
  action: (tx: IDBTransaction, setResult: (value: T) => void) => void,
) =>
  openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        let result: T;
        action(tx, (value) => {
          result = value;
        });
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? new Error('历史保存失败'));
        tx.onabort = () => reject(tx.error ?? new Error('历史保存已中止'));
      }),
  );

// 每个操作 ID 只在其账号的存储空间内生效。
const operationKey = (ownerId: string, operationId: string) =>
  `${ownerId}:${operationId}`;

// 按事务内分配的序号恢复队列因果顺序。
const sortQueuedOperations = (operations: QueuedOperation[]) =>
  [...operations]
    .sort((left, right) => left.order - right.order)
    .map((item) => item.operation);

// 所有队列查询始终使用账号索引。
const readOperations = (tx: IDBTransaction, ownerId: string) => {
  const request = tx
    .objectStore('history-operations')
    .index('ownerId')
    .getAll(ownerId);
  return request;
};

// 只恢复指定账号的云端缓存与补传队列。
export const readLocalHistory = (ownerId: string): Promise<LocalHistory> =>
  transaction<LocalHistory>(
    ['history-cache', 'history-operations'],
    'readonly',
    (tx, setResult) => {
      const cacheRequest = tx.objectStore('history-cache').get(ownerId);
      const operationRequest = readOperations(tx, ownerId);
      const finish = () => {
        if (
          cacheRequest.readyState !== 'done' ||
          operationRequest.readyState !== 'done'
        ) {
          return;
        }

        const snapshot = readSnapshot(cacheRequest.result, ownerId);
        const queued = readQueuedOperations(operationRequest.result, ownerId);
        setResult({ snapshot, operations: sortQueuedOperations(queued) });
      };
      cacheRequest.onsuccess = finish;
      operationRequest.onsuccess = finish;
    },
  );

// 保存操作先入本地队列，再由 store 触发网络补传。
export const enqueueHistoryOperation = (
  ownerId: string,
  operation: HistoryOperation,
) => {
  if (!isHistoryOperation(operation)) {
    return Promise.reject(new Error('观看历史格式不正确'));
  }
  return transaction<HistoryOperation[]>(
    ['history-operations'],
    'readwrite',
    (tx, setResult) => {
      const store = tx.objectStore('history-operations');
      const existing = store.index('ownerId').getAll(ownerId);
      existing.onsuccess = () => {
        const items = readQueuedOperations(existing.result, ownerId);
        const order =
          items.reduce((maximum, item) => Math.max(maximum, item.order), -1) +
          1;
        store.put({
          key: operationKey(ownerId, operation.id),
          ownerId,
          order,
          operation,
        });

        const queued = store.index('ownerId').getAll(ownerId);
        queued.onsuccess = () => {
          const operations = readQueuedOperations(queued.result, ownerId);
          setResult(sortQueuedOperations(operations));
        };
      };
    },
  );
};

// 同步确认后，缓存快照与删除已确认的队列项在一个事务中提交。
export const commitHistorySync = (
  ownerId: string,
  incoming: HistorySnapshot,
  acknowledgedIds: string[],
) =>
  transaction<{ snapshot: HistorySnapshot; operations: HistoryOperation[] }>(
    ['history-cache', 'history-operations'],
    'readwrite',
    (tx, setResult) => {
      const cacheStore = tx.objectStore('history-cache');
      const operationsStore = tx.objectStore('history-operations');
      const cacheRequest = cacheStore.get(ownerId);
      cacheRequest.onsuccess = () => {
        const local = readSnapshot(cacheRequest.result, ownerId);
        const snapshot = mergeHistorySnapshots(local, incoming);
        cacheStore.put({ ownerId, snapshot } satisfies CachedHistory);

        acknowledgedIds.forEach((id) =>
          operationsStore.delete(operationKey(ownerId, id)),
        );

        const request = readOperations(tx, ownerId);
        request.onsuccess = () => {
          const queued = readQueuedOperations(request.result, ownerId);
          setResult({ snapshot, operations: sortQueuedOperations(queued) });
        };
      };
    },
  );

// 同源历史接口带会话 Cookie，不在浏览器本地保存认证令牌。
const requestHistory = async (
  path: string,
  init?: RequestInit,
): Promise<unknown> => {
  const response = await fetch(path, {
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
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `同步失败（${response.status}）`;
    throw new Error(message);
  }
  return response.json();
};

// 回包中的账号也必须匹配，拒绝会话切换期间的旧请求结果。
export const fetchHistory = async (ownerId: string, signal: AbortSignal) => {
  const value = await requestHistory('/api/v1/history', { signal });
  if (!isHistorySnapshot(value) || value.ownerId !== ownerId) {
    throw new Error('云端观看历史格式错误');
  }
  return value;
};

// 预期账号随操作提交，由服务端与当前会话再次核对。
export const syncHistory = async (
  ownerId: string,
  operations: HistoryOperation[],
  signal: AbortSignal,
) => {
  const value = await requestHistory('/api/v1/history/sync', {
    method: 'POST',
    signal,
    body: JSON.stringify({ ownerId, operations }),
  });
  if (!isHistorySnapshot(value) || value.ownerId !== ownerId) {
    throw new Error('云端观看历史格式错误');
  }
  return value;
};
