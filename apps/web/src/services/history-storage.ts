import { z } from 'zod';
import {
  emptyHistory,
  historyOperationSchema,
  historySnapshotSchema,
  mergeHistorySnapshots,
} from '@ym-video/history';
import type { HistoryOperation, HistorySnapshot } from '@ym-video/history';

// 云端确认快照按账号隔离。
interface CachedHistory {
  ownerId: string;
  snapshot: HistorySnapshot;
}

// IndexedDB 队列读取时验证账号、键与持久化序号。
const queuedOperationSchema = z
  .object({
    key: z.string(),
    ownerId: z.string(),
    order: z.int().nonnegative(),
    operation: historyOperationSchema,
  })
  .refine(
    (value) => value.key === operationKey(value.ownerId, value.operation.id),
  );
type QueuedOperation = z.infer<typeof queuedOperationSchema>;

const cachedHistorySchema = z.object({
  ownerId: z.string(),
  snapshot: historySnapshotSchema,
});

// 缓存边界核对账号归属，损坏数据使用该账号的空快照。
const readSnapshot = (value: unknown, ownerId: string): HistorySnapshot => {
  const result = cachedHistorySchema.safeParse(value);
  return result.success &&
    result.data.ownerId === ownerId &&
    result.data.snapshot.ownerId === ownerId
    ? result.data.snapshot
    : emptyHistory(ownerId);
};

// 队列逐项解析，保留属于当前账号的有效操作。
const readQueuedOperations = (
  value: unknown,
  ownerId: string,
): QueuedOperation[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item: unknown) => {
    const result = queuedOperationSchema.safeParse(item);
    return result.success && result.data.ownerId === ownerId
      ? [result.data]
      : [];
  });
};

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
