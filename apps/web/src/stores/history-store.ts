import { computed, onScopeDispose, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  emptyHistory,
  HISTORY_ENTRY_MAX_BYTES,
  projectHistory,
} from '@ym-video/history';
import type {
  HistoryEntry,
  HistoryOperation,
  HistorySnapshot,
  HistoryToken,
} from '@ym-video/history';
import { getCachedUser } from '@/services/auth';
import {
  commitHistorySync,
  enqueueHistoryOperation,
  fetchHistory,
  HistoryServiceError,
  readLocalHistory,
  syncHistory,
} from '@/services/history';
import {
  HISTORY_ERROR_MESSAGE_MAP,
  type HistoryErrorType,
  type HistoryStatus,
} from '@/map/history';
import { useRequest } from '@/composables/use-request';
import { storageError } from '@ym-video/ui/lib/toast';

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
  const syncStatus = ref<HistoryStatus>('synced');
  const syncErrorType = ref<HistoryErrorType | null>(null);
  const syncError = computed(() =>
    syncErrorType.value ? HISTORY_ERROR_MESSAGE_MAP[syncErrorType.value] : '',
  );

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

  // 网络异常按网络状态、请求类型和本机存储分别提示。
  const getErrorType = (cause: unknown): HistoryErrorType => {
    if (cause instanceof HistoryServiceError) {
      return cause.type;
    }
    if (cause instanceof TypeError) {
      return navigator.onLine ? 'network' : 'offline';
    }
    if (cause instanceof DOMException && cause.name === 'TimeoutError') {
      return 'timeout';
    }
    return 'unknown';
  };

  // 错误状态与显示文案通过映射关联。
  const setError = (type: HistoryErrorType) => {
    syncStatus.value = 'error';
    syncErrorType.value = type;
  };
  // 每次切账号推进代次，旧异步结果不得修改新账号。
  let accountGeneration = 0;
  // 同一账号初始化与请求合并，切换时立即取消。
  let accountTask: Promise<void> | undefined;
  // 标签页只广播变更通知，数据以持久化事务为准。
  const historyChannel =
    typeof BroadcastChannel === 'undefined'
      ? undefined
      : new BroadcastChannel('ym-video-history');
  onScopeDispose(() => {
    accountGeneration += 1;
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
          if (generation !== accountGeneration) {
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
          if (generation === accountGeneration) {
            setError('storage');
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
      syncErrorType.value = null;
    }
  };

  // 只在账号切换或首次加载时读取该账号的离线缓存。
  const setAccount = (nextOwnerId: string | null) => {
    if (nextOwnerId === ownerId.value && (loaded.value || accountTask)) {
      return accountTask ?? Promise.resolve();
    }

    accountGeneration += 1;
    const generation = accountGeneration;
    refreshRequest.cancel();
    syncRequest.cancel();
    ownerId.value = nextOwnerId;
    base.value = nextOwnerId ? emptyHistory(nextOwnerId) : null;
    operations.value = [];
    loaded.value = !nextOwnerId;
    syncStatus.value = 'synced';
    syncErrorType.value = null;

    if (!nextOwnerId) {
      accountTask = undefined;
      return Promise.resolve();
    }

    const task = (async () => {
      try {
        const local = await readLocalHistory(nextOwnerId);
        if (generation !== accountGeneration) {
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
          setError('offline');
        }
      } catch {
        if (generation !== accountGeneration) {
          return;
        }
        loaded.value = true;
        setError('storage');
        storageError('观看历史');
      }
    })();
    accountTask = task;
    return task;
  };

  // 读取云端快照后补交离线操作，同一轮刷新共用一个任务。
  const refreshRequest = useRequest(
    async (signal, currentOwner: string, generation: number) => {
      try {
        const snapshot = await fetchHistory(currentOwner, signal);
        const local = await commitHistorySync(currentOwner, snapshot, []);
        if (generation !== accountGeneration) {
          return;
        }
        base.value = local.snapshot;
        operations.value = local.operations;
        syncStatus.value = 'pending';
        syncErrorType.value = null;
        updateStatus();
        requestSync();
      } catch (cause) {
        if (signal.aborted || generation !== accountGeneration) {
          return;
        }
        setError(getErrorType(cause));
      }
    },
  );
  const refresh = () => {
    const currentOwner = ownerId.value;
    if (!currentOwner || !loaded.value || !navigator.onLine) {
      return Promise.resolve();
    }
    return (
      refreshRequest.task.value ??
      refreshRequest.execute(currentOwner, accountGeneration)
    );
  };

  // 分批提交本地队列，服务端返回快照后原子清除已确认操作。
  const flush = async (
    signal: AbortSignal,
    expectedOwner = ownerId.value,
    generation = accountGeneration,
  ) => {
    const currentOwner = expectedOwner;
    if (!currentOwner || !loaded.value || !navigator.onLine) {
      updateStatus();
      return;
    }
    while (
      navigator.onLine &&
      !signal.aborted &&
      generation === accountGeneration
    ) {
      const local = await readLocalHistory(currentOwner);
      if (signal.aborted || generation !== accountGeneration) {
        return;
      }
      if (!local.operations.length) {
        base.value = local.snapshot;
        operations.value = [];
        syncStatus.value = 'synced';
        syncErrorType.value = null;
        return;
      }

      const batch = makeSyncBatch(currentOwner, local.operations);
      if (!batch.length) {
        throw new HistoryServiceError('oversized-entry');
      }
      const snapshot = await syncHistory(currentOwner, batch, signal);
      const committed = await commitHistorySync(
        currentOwner,
        snapshot,
        batch.map((operation) => operation.id),
      );
      if (generation !== accountGeneration) {
        return;
      }
      base.value = committed.snapshot;
      operations.value = committed.operations;
      syncStatus.value = 'pending';
      syncErrorType.value = null;
      announceChange(currentOwner);
      updateStatus();
    }
  };

  // 同账号的同步请求串行执行，统一请求函数负责取消与任务释放。
  const syncRequest = useRequest(
    async (signal, currentOwner: string | null, generation: number) => {
      try {
        if (currentOwner && navigator.locks) {
          await navigator.locks.request<void>(
            `ym-video-history:${currentOwner}`,
            { signal },
            () => flush(signal, currentOwner, generation),
          );
        } else {
          await flush(signal, currentOwner, generation);
        }
      } catch (cause) {
        if (!signal.aborted && generation === accountGeneration) {
          setError(getErrorType(cause));
        }
      }
    },
  );
  const requestSync = () => {
    if (syncRequest.task.value) {
      return syncRequest.task.value;
    }
    const generation = accountGeneration;
    const task = syncRequest.execute(ownerId.value, generation);
    task.then(() => {
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

  // 播放复用已确认的账号，优先使用本机续播记录，不再验证会话。
  const init = async (movieId: string) => {
    // 直达播放器时复用首次路由确认的账号，避免依赖全局监听的执行顺序。
    const currentOwner = ownerId.value ?? getCachedUser()?.id;

    if (!currentOwner) {
      throw new Error('请先登录后查看观看历史');
    }
    await setAccount(currentOwner);
    // 新设备尚无该影片时读取一次云端进度，避免用零进度覆盖已有记录。
    const cachedMovie = entries.value.some((entry) => entry.id === movieId);
    if (!cachedMovie && refreshRequest.task.value) {
      await refreshRequest.task.value;
    }
    if (ownerId.value !== currentOwner) {
      throw new Error('账号已切换，请重新打开影片');
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

  // 本机持久化成功后更新列表状态并开始云端同步。
  const enqueue = async (operation: HistoryOperation) => {
    const currentOwner = ownerId.value;
    if (!currentOwner) {
      return false;
    }

    const generation = accountGeneration;
    try {
      const queued = await enqueueHistoryOperation(currentOwner, operation);
      announceChange(currentOwner);
      if (generation !== accountGeneration) {
        return false;
      }

      operations.value = queued;
      syncStatus.value = 'pending';
      syncErrorType.value = null;
      requestSync();
      return true;
    } catch {
      if (generation !== accountGeneration) {
        return false;
      }

      setError('storage');
      storageError('观看历史');
      return false;
    }
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

    if (
      new TextEncoder().encode(JSON.stringify(operation.entry)).byteLength >
      HISTORY_ENTRY_MAX_BYTES
    ) {
      setError('oversized-entry');
      return false;
    }

    return enqueue(operation);
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

  return {
    ownerId,
    entries,
    loaded,
    syncStatus,
    syncError,
    init,
    setAccount,
    refresh,
    retry: refresh,
    token,
    save,
    remove,
    clear,
  };
});
