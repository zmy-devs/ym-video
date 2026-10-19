import { computed, onScopeDispose, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  emptyHistory,
  HISTORY_ENTRY_MAX_BYTES,
  isHistoryOperation,
  projectHistory,
} from '@ym-video/history';
import type {
  HistoryEntry,
  HistoryOperation,
  HistorySnapshot,
  HistoryToken,
} from '@ym-video/history';
import { authClient } from '@/services/auth';
import {
  commitHistorySync,
  enqueueHistoryOperation,
  fetchHistory,
  readLocalHistory,
  syncHistory,
} from '@/services/history';
import { storageError } from '@/lib/storage';

// 留出 HTTP JSON 包装开销，避免超过 API 的请求大小上限。
const MAX_SYNC_BYTES = 950_000;

// 按队列因果顺序分批，不能跳过删除或清空屏障。
const makeSyncBatch = (ownerId: string, operations: HistoryOperation[]) => {
  const batch: HistoryOperation[] = [];
  for (const operation of operations) {
    if (batch.length === 20) {
      break;
    }
    const candidate = [...batch, operation];
    const request = JSON.stringify({ ownerId, operations: candidate });
    if (new TextEncoder().encode(request).byteLength > MAX_SYNC_BYTES) {
      break;
    }
    batch.push(operation);
  }
  return batch;
};

// 当前账号的云端快照、离线操作和后台同步状态。
export const useHistoryStore = defineStore('history', () => {
  // 只使用服务端会话确认过的账号。
  const ownerId = ref<string | null>(null);
  // 最近一次云端确认的完整快照。
  const base = ref<HistorySnapshot | null>(null);
  // 已持久化、尚未得到云端确认的操作。
  const operations = ref<HistoryOperation[]>([]);
  // 本机账号缓存是否已读取。
  const loaded = ref(false);
  // 界面显示的同步状态与具体失败原因。
  const syncStatus = ref<'synced' | 'pending' | 'error'>('synced');
  const syncError = ref('');

  // 在云端快照上投影本机待传操作，不等待网络更新列表。
  const visible = computed(() =>
    base.value ? projectHistory(base.value, operations.value) : null,
  );
  // 删除墓碑不展示，影片按实际观看时间倒序。
  const entries = computed(
    () =>
      visible.value?.records
        .flatMap((record) => (record.entry ? [record.entry] : []))
        .sort((left, right) => right.watchedAt - left.watchedAt) ?? [],
  );
  // 每次切账号推进代次，旧异步结果不得修改新账号。
  let accountGeneration = 0;
  // 同一账号初始化与请求合并，切换时立即取消。
  let accountTask: Promise<void> | undefined;
  let refreshController: AbortController | undefined;
  let refreshPromise: Promise<void> | undefined;
  let syncController: AbortController | undefined;
  let syncPromise: Promise<void> | undefined;
  // 标签页只广播变更通知，数据以持久化事务为准。
  const historyChannel =
    typeof BroadcastChannel === 'undefined'
      ? undefined
      : new BroadcastChannel('ym-video-history');
  onScopeDispose(() => {
    accountGeneration += 1;
    refreshController?.abort();
    syncController?.abort();
    historyChannel?.close();
  });

  // 通知同源其他标签页重读自己的账号缓存。
  const announceChange = (currentOwner: string) => {
    historyChannel?.postMessage({ ownerId: currentOwner });
  };

  historyChannel?.addEventListener(
    'message',
    (event: MessageEvent<unknown>) => {
      if (
        typeof event.data !== 'object' ||
        event.data === null ||
        !('ownerId' in event.data) ||
        event.data.ownerId !== ownerId.value ||
        !ownerId.value ||
        !loaded.value
      ) {
        return;
      }

      const currentOwner = ownerId.value;
      const generation = accountGeneration;
      readLocalHistory(currentOwner)
        .then((local) => {
          if (
            generation !== accountGeneration ||
            currentOwner !== ownerId.value
          ) {
            return;
          }
          base.value = local.snapshot;
          operations.value = local.operations;
          updateStatus();
          if (navigator.onLine) {
            requestSync();
          }
        })
        .catch(() => {
          if (
            generation === accountGeneration &&
            currentOwner === ownerId.value
          ) {
            syncStatus.value = 'error';
            syncError.value = '本地观看历史无法读取';
          }
        });
    },
  );

  // 未成功重试之前保留错误，不以队列长度误报保存成功。
  const updateStatus = () => {
    if (syncStatus.value === 'error') {
      return;
    }
    syncStatus.value = operations.value.length ? 'pending' : 'synced';
    if (syncStatus.value === 'synced') {
      syncError.value = '';
    }
  };

  // 只在账号切换或首次加载时读取该账号的离线缓存。
  const setAccount = (nextOwnerId: string | null) => {
    if (nextOwnerId === ownerId.value && (loaded.value || accountTask)) {
      return accountTask ?? Promise.resolve();
    }

    accountGeneration += 1;
    const generation = accountGeneration;
    refreshController?.abort();
    syncController?.abort();
    refreshController = undefined;
    syncController = undefined;
    refreshPromise = undefined;
    syncPromise = undefined;
    ownerId.value = nextOwnerId;
    base.value = nextOwnerId ? emptyHistory(nextOwnerId) : null;
    operations.value = [];
    loaded.value = !nextOwnerId;
    syncStatus.value = 'synced';
    syncError.value = '';

    if (!nextOwnerId) {
      accountTask = undefined;
      return Promise.resolve();
    }

    const task = (async () => {
      try {
        const local = await readLocalHistory(nextOwnerId);
        if (generation !== accountGeneration || ownerId.value !== nextOwnerId) {
          return;
        }
        base.value = local.snapshot;
        operations.value = local.operations;
        loaded.value = true;
        updateStatus();

        if (navigator.onLine) {
          syncStatus.value = 'pending';
          refresh();
        } else {
          syncStatus.value = 'error';
          syncError.value = '离线，显示此设备缓存';
        }
      } catch {
        if (generation !== accountGeneration) {
          return;
        }
        loaded.value = true;
        syncStatus.value = 'error';
        syncError.value = '本地观看历史无法读取';
        storageError('观看历史');
      }
    })();
    accountTask = task;
    task.finally(() => {
      if (accountTask === task) {
        accountTask = undefined;
      }
    });
    return task;
  };

  // 登录账号切换后先读取云端，再补交该账号的离线操作。
  const refresh = () => {
    const currentOwner = ownerId.value;
    if (!currentOwner || !loaded.value || !navigator.onLine) {
      return Promise.resolve();
    }
    if (refreshPromise) {
      return refreshPromise;
    }

    const generation = accountGeneration;
    const controller = new AbortController();
    refreshController = controller;
    const task = (async () => {
      try {
        const snapshot = await fetchHistory(currentOwner, controller.signal);
        if (
          generation !== accountGeneration ||
          currentOwner !== ownerId.value ||
          controller.signal.aborted
        ) {
          return;
        }
        const local = await commitHistorySync(currentOwner, snapshot, []);
        if (
          generation !== accountGeneration ||
          currentOwner !== ownerId.value
        ) {
          return;
        }
        base.value = local.snapshot;
        operations.value = local.operations;
        syncStatus.value = 'pending';
        syncError.value = '';
        updateStatus();
        requestSync();
      } catch (cause) {
        if (controller.signal.aborted || generation !== accountGeneration) {
          return;
        }
        syncStatus.value = 'error';
        syncError.value = cause instanceof Error ? cause.message : '同步失败';
      }
    })();
    refreshPromise = task;
    task.finally(() => {
      if (refreshPromise === task) {
        refreshPromise = undefined;
      }
    });
    return task;
  };

  // 分批提交本地队列，服务端返回快照后原子清除已确认操作。
  const flush = async (
    expectedOwner = ownerId.value,
    generation = accountGeneration,
  ) => {
    const currentOwner = expectedOwner;
    if (!currentOwner || !loaded.value || !navigator.onLine) {
      updateStatus();
      return;
    }
    if (currentOwner !== ownerId.value || generation !== accountGeneration) {
      return;
    }

    const controller = new AbortController();
    syncController = controller;
    try {
      while (
        navigator.onLine &&
        currentOwner === ownerId.value &&
        generation === accountGeneration
      ) {
        const local = await readLocalHistory(currentOwner);
        if (
          currentOwner !== ownerId.value ||
          generation !== accountGeneration
        ) {
          return;
        }
        if (!local.operations.length) {
          base.value = local.snapshot;
          operations.value = [];
          syncStatus.value = 'synced';
          syncError.value = '';
          return;
        }

        const batch = makeSyncBatch(currentOwner, local.operations);
        if (!batch.length) {
          throw new Error('单条观看记录过大，无法同步到云端');
        }
        const snapshot = await syncHistory(
          currentOwner,
          batch,
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          currentOwner !== ownerId.value ||
          generation !== accountGeneration
        ) {
          return;
        }
        const committed = await commitHistorySync(
          currentOwner,
          snapshot,
          batch.map((operation) => operation.id),
        );
        if (
          currentOwner !== ownerId.value ||
          generation !== accountGeneration
        ) {
          return;
        }
        base.value = committed.snapshot;
        operations.value = committed.operations;
        syncStatus.value = 'pending';
        syncError.value = '';
        announceChange(currentOwner);
        updateStatus();
      }
    } catch (cause) {
      if (controller.signal.aborted || generation !== accountGeneration) {
        return;
      }
      syncStatus.value = 'error';
      syncError.value = cause instanceof Error ? cause.message : '同步失败';
    }
  };

  // 合并同一轮请求，队列追加期间结束时再检查一次。
  const requestSync = () => {
    if (syncPromise) {
      return syncPromise;
    }

    const currentOwner = ownerId.value;
    const generation = accountGeneration;
    const task = (async () => {
      try {
        if (currentOwner && navigator.locks) {
          await navigator.locks.request<void>(
            `ym-video-history:${currentOwner}`,
            async () => {
              await flush(currentOwner, generation);
            },
          );
        } else {
          await flush(currentOwner, generation);
        }
      } catch (cause) {
        if (
          currentOwner !== ownerId.value ||
          generation !== accountGeneration
        ) {
          return;
        }
        syncStatus.value = 'error';
        syncError.value = cause instanceof Error ? cause.message : '同步失败';
      }
    })();
    syncPromise = task;
    task.finally(() => {
      if (syncPromise === task) {
        syncPromise = undefined;
      }
      if (
        generation === accountGeneration &&
        syncStatus.value !== 'error' &&
        operations.value.length &&
        ownerId.value &&
        navigator.onLine
      ) {
        requestSync();
      }
    });
    return task;
  };

  // 组件初始化时校验当前 Cookie 会话，并载入对应账号的云端记录。
  const init = async (movieId?: string) => {
    const generation = accountGeneration;
    let currentOwner = ownerId.value;
    if (!currentOwner) {
      const session = await authClient.getSession();
      currentOwner = session.data?.user?.id ?? null;
      if (generation !== accountGeneration && currentOwner !== ownerId.value) {
        throw new Error('账号已切换，请重新打开影片');
      }
    }
    if (!currentOwner) {
      throw new Error('请先登录后查看观看历史');
    }
    await setAccount(currentOwner);
    // 已有账号缓存可立即播放；新设备首次打开时等待有超时的云端读取。
    const cachedMovie = entries.value.some((entry) => entry.id === movieId);
    if (!cachedMovie && refreshPromise) {
      await refreshPromise;
    }
  };

  // 播放页打开时捕获账号、清空版本和影片删除版本。
  const token = (id: string): HistoryToken | null => {
    const snapshot = visible.value;
    if (!snapshot || !loaded.value || !ownerId.value) {
      return null;
    }
    const record = snapshot.records.find((item) => item.id === id);
    return {
      ownerId: ownerId.value,
      epoch: snapshot.epoch,
      generation: record?.generation ?? 'initial',
    };
  };

  // 进度先写入本地队列，再尝试云端补传。
  const save = async (
    entry: HistoryEntry,
    playbackToken: HistoryToken | null,
  ) => {
    const snapshot = visible.value;
    if (
      !playbackToken ||
      playbackToken.ownerId !== ownerId.value ||
      !snapshot ||
      playbackToken.epoch !== snapshot.epoch
    ) {
      return false;
    }

    const current = snapshot.records.find((item) => item.id === entry.id);
    if ((current?.generation ?? 'initial') !== playbackToken.generation) {
      return false;
    }
    const episode = String(entry.episode);
    const progress = entry.progress[episode] ?? { currentTime: 0, duration: 0 };
    if (
      current?.entry?.episode === entry.episode &&
      current.episodeStamps[episode]?.at === entry.watchedAt &&
      current.entry.progress[episode]?.currentTime === progress.currentTime &&
      current.entry.progress[episode]?.duration === progress.duration
    ) {
      return true;
    }

    const operationId = crypto.randomUUID();
    const at = entry.watchedAt;
    const operation: HistoryOperation = {
      id: operationId,
      at,
      epoch: playbackToken.epoch,
      type: 'save',
      generation: playbackToken.generation,
      entry: {
        ...entry,
        episodes: entry.episodes.map((item) => ({ ...item })),
        watchedAt: at,
        progress: { [episode]: { ...progress } },
      },
    };

    if (!isHistoryOperation(operation)) {
      syncStatus.value = 'error';
      syncError.value = '影片信息不完整，观看历史未保存';
      return false;
    }
    if (
      new TextEncoder().encode(JSON.stringify(operation.entry)).byteLength >
      HISTORY_ENTRY_MAX_BYTES
    ) {
      syncStatus.value = 'error';
      syncError.value = '影片信息过大，观看历史未保存';
      return false;
    }

    const currentOwner = playbackToken.ownerId;
    const generation = accountGeneration;
    try {
      const queued = await enqueueHistoryOperation(currentOwner, operation);
      announceChange(currentOwner);
      if (currentOwner !== ownerId.value || generation !== accountGeneration) {
        return false;
      }
      operations.value = queued;
      syncStatus.value = 'pending';
      syncError.value = '';
      requestSync();
      return true;
    } catch {
      if (currentOwner !== ownerId.value || generation !== accountGeneration) {
        return false;
      }
      syncStatus.value = 'error';
      syncError.value = '本地观看历史保存失败';
      storageError('观看历史');
      return false;
    }
  };

  // 删除墓碑阻止旧播放器或旧请求再次创建相同影片记录。
  const remove = async (id: string) => {
    const snapshot = visible.value;
    const record = snapshot?.records.find((item) => item.id === id);
    if (!ownerId.value || !snapshot || !record?.entry) {
      return;
    }
    const operation: HistoryOperation = {
      id: crypto.randomUUID(),
      at: Date.now(),
      epoch: snapshot.epoch,
      type: 'remove',
      generation: record.generation,
      movieId: id,
    };
    await enqueue(operation);
  };

  // 清空推进账号版本屏障，所有旧播放器写入都会失效。
  const clear = async () => {
    const snapshot = visible.value;
    if (!ownerId.value || !snapshot) {
      return;
    }
    await enqueue({
      id: crypto.randomUUID(),
      at: Date.now(),
      epoch: snapshot.epoch,
      type: 'clear',
    });
  };

  // 所有本地变更沿用统一的持久化、状态和补传流程。
  const enqueue = async (operation: HistoryOperation) => {
    const currentOwner = ownerId.value;
    if (!currentOwner) {
      return;
    }
    const generation = accountGeneration;
    try {
      const queued = await enqueueHistoryOperation(currentOwner, operation);
      announceChange(currentOwner);
      if (currentOwner !== ownerId.value || generation !== accountGeneration) {
        return;
      }
      operations.value = queued;
      syncStatus.value = 'pending';
      syncError.value = '';
      requestSync();
    } catch {
      if (currentOwner !== ownerId.value || generation !== accountGeneration) {
        return;
      }
      syncStatus.value = 'error';
      syncError.value = '本地观看历史保存失败';
      storageError('观看历史');
    }
  };

  // 在线事件、页面聚焦和用户重试共用一个刷新入口。
  const retry = () => refresh();

  return {
    ownerId,
    entries,
    loaded,
    syncStatus,
    syncError,
    init,
    setAccount,
    refresh,
    retry,
    token,
    save,
    remove,
    clear,
  };
});
