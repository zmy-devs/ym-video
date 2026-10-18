import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { HistoryEntry } from '@/types';
import {
  clearHistory,
  deleteHistory,
  putHistory,
  readHistory,
} from '@/services/history';
import { storageError } from '@/lib/storage';

// 所有页面共用一份内存历史，持久化失败时仍可继续本次播放。
export const useHistoryStore = defineStore('history', () => {
  // 内存中的有效观看记录。
  const entries = ref<HistoryEntry[]>([]);

  // 历史初始化是否已完成。
  const loaded = ref(false);

  // 按最后观看时间排序的记录。
  const sorted = computed(() =>
    [...entries.value].sort((a, b) => b.watchedAt - a.watchedAt),
  );

  // 所有调用方共用的初始化任务。
  let initialization: Promise<void> | undefined;

  // 串行提交的持久化操作队列。
  let writes = Promise.resolve();

  // 串行保存和删除，防止旧快照晚于删除或新进度提交。
  const enqueue = (operation: () => Promise<unknown>) => {
    writes = writes
      .then(operation)
      .then(() => undefined)
      .catch(() => storageError('观看历史'));
    return writes;
  };

  // 页面和播放器等待同一次初始化。
  const init = () => {
    initialization ??= readHistory()
      .then((result) => {
        entries.value = result;
      })
      .catch(() => storageError('观看历史'))
      .finally(() => {
        loaded.value = true;
      });
    return initialization;
  };

  // 重新聚焦标签页时读取其他播放器标签页写入的历史。
  const refresh = async () => {
    await init();

    // 读取期间若本页发生保存或删除，不用旧结果覆盖新状态。
    const current = entries.value;

    try {
      await writes;

      // 等待本页写入完成后再读取跨标签页的最新记录。
      const result = await readHistory();

      if (entries.value === current) {
        entries.value = result;
      }
    } catch {
      storageError('观看历史');
    }
  };

  // 先更新界面，再保存不可变快照。
  const save = (entry: HistoryEntry) => {
    // 独立快照，避免异步提交期间被修改。
    const snapshot: HistoryEntry = JSON.parse(JSON.stringify(entry));
    entries.value = [
      snapshot,
      ...entries.value.filter((item) => item.id !== snapshot.id),
    ];
    return enqueue(() => putHistory(snapshot));
  };

  // 删除历史不会在异步保存结束后重新出现。
  const remove = (id: string) => {
    entries.value = entries.value.filter((item) => item.id !== id);
    return enqueue(() => deleteHistory(id));
  };

  // 清空当前浏览器的全部观看记录。
  const clear = () => {
    entries.value = [];
    return enqueue(clearHistory);
  };

  return { entries, sorted, loaded, init, refresh, save, remove, clear };
});
