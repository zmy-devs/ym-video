import type { HistoryEntry } from '@/types';
import { isRecord } from './api';
import { httpUrl, movieKey } from '@/lib/movie';

// 单独数据库仅存 Web 历史，不导入旧桌面 SQLite。
let database: Promise<IDBDatabase> | undefined;

// 首次使用时打开数据库，并处理浏览器拒绝或升级被阻塞。
const openDatabase = () => {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    // 当前请求或操作的唯一标识。
    const request = indexedDB.open('ym-video-web', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('history', { keyPath: 'id' });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭其他旧版页面后重试'));
  });
  return database;
};

// 只在事务提交后报告成功，捕获配额不足等异步错误。
const transaction = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  // 已打开的当前浏览器数据库。
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    // 等待完整提交后再报告成功的事务。
    const tx = db.transaction('history', mode);

    // 当前请求或操作的唯一标识。
    const request = action(tx.objectStore('history'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? request.error);
    tx.onabort = () => reject(tx.error ?? new Error('历史保存已中止'));
  });
};

// 丢弃损坏的历史项，避免刷新后出现空白播放器。
export const isHistoryEntry = (value: unknown): value is HistoryEntry => {
  if (
    !isRecord(value) ||
    typeof value.sourceId !== 'string' ||
    typeof value.vodId !== 'string'
  ) {
    return false;
  }
  if (
    value.id !== movieKey(value.sourceId, value.vodId) ||
    !Number.isInteger(value.episode) ||
    Number(value.episode) < 0
  ) {
    return false;
  }
  if (
    !Number.isFinite(value.watchedAt) ||
    !Array.isArray(value.episodes) ||
    !isRecord(value.progress)
  ) {
    return false;
  }
  if (
    ![
      'name',
      'pic',
      'content',
      'year',
      'area',
      'lang',
      'category',
      'remarks',
    ].every((key) => typeof value[key] === 'string')
  ) {
    return false;
  }
  if (value.episodes.length && Number(value.episode) >= value.episodes.length) {
    return false;
  }
  return (
    value.episodes.every(
      (episode) =>
        isRecord(episode) &&
        typeof episode.label === 'string' &&
        typeof episode.url === 'string' &&
        Boolean(httpUrl(episode.url)),
    ) &&
    Object.values(value.progress).every(
      (progress) =>
        isRecord(progress) &&
        typeof progress.currentTime === 'number' &&
        Number.isFinite(progress.currentTime) &&
        progress.currentTime >= 0 &&
        typeof progress.duration === 'number' &&
        Number.isFinite(progress.duration) &&
        progress.duration >= 0,
    )
  );
};

// 读出当前浏览器中的有效观看历史。
export const readHistory = async () => {
  // 数据库读出的待验证历史记录。
  const values: unknown[] = await transaction('readonly', (store) =>
    store.getAll(),
  );
  return values.filter(isHistoryEntry);
};

// 每次写入独立快照，避免 IndexedDB 接收 Vue Proxy。
export const putHistory = (entry: HistoryEntry) =>
  transaction('readwrite', (store) =>
    store.put(JSON.parse(JSON.stringify(entry))),
  );

// 删除单条历史。
export const deleteHistory = (id: string) =>
  transaction('readwrite', (store) => store.delete(id));

// 清空当前浏览器的观看历史。
export const clearHistory = () =>
  transaction('readwrite', (store) => store.clear());
