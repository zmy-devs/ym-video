import {
  historyEntrySchema,
  historyOperationSchema,
  historySnapshotSchema,
} from './schema.ts';
export {
  historyEntrySchema,
  historyOperationSchema,
  historySnapshotSchema,
} from './schema.ts';

// 历史记录中的单集播放信息。
export interface Episode {
  label: string;
  url: string;
}

// 客户端与 API 历史同步使用的影片信息。
export interface Movie {
  id: string;
  vodId: string;
  sourceId: string;
  name: string;
  pic: string;
  year: string;
  area: string;
  lang: string;
  category: string;
  remarks: string;
  episodes: Episode[];
}

export type HistoryErrorType =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'server'
  | 'request'
  | 'storage'
  | 'oversized-entry'
  | 'invalid-response'
  | 'unknown';

// 每集独立进度，允许主动回看和从头播放。
export interface Progress {
  currentTime: number;
  duration: number;
}

export interface HistoryEntry extends Movie {
  episode: number;
  progress: Record<string, Progress>;
  watchedAt: number;
}

// 同一毫秒的操作以随机 ID 确定稳定顺序。
export interface WatchStamp {
  at: number;
  id: string;
}

// 删除后保留版本，旧播放器无法自动重建记录。
export interface HistoryRecord {
  id: string;
  generation: string;
  entry: HistoryEntry | null;
  stamp: WatchStamp;
  episodeStamps: Record<string, WatchStamp>;
}

export interface HistorySnapshot {
  ownerId: string;
  epoch: string;
  revision: number;
  records: HistoryRecord[];
}

// 播放器在打开影片时固定版本，后台刷新不替换此凭据。
export interface HistoryToken {
  ownerId: string;
  epoch: string;
  generation: string;
}

// 只提交当前集的进度，避免旧影片快照覆盖其他集。
export type HistoryOperation = {
  id: string;
  at: number;
  epoch: string;
} & (
  | { type: 'save'; generation: string; entry: HistoryEntry }
  | { type: 'remove'; generation: string; movieId: string }
  | { type: 'clear' }
);

// 单片信息限制为 D1 行和同步请求预留空间，浏览器提前拒绝无法上传的记录。
export const HISTORY_ENTRY_MAX_BYTES = 900_000;

// 初始化版本无需依赖浏览器或 Worker 的全局可变状态。
export const emptyHistory = (ownerId: string): HistorySnapshot => ({
  ownerId,
  epoch: 'initial',
  revision: 0,
  records: [],
});

// 时间一致时保持所有设备确定性合并。
const newer = (left: WatchStamp, right?: WatchStamp) =>
  !right || left.at > right.at || (left.at === right.at && left.id > right.id);

// 云端和离线队列使用同一套版本屏障与逐集合并规则。
export const applyHistoryOperation = (
  snapshot: HistorySnapshot,
  operation: HistoryOperation,
): HistorySnapshot => {
  if (operation.epoch !== snapshot.epoch) {
    return snapshot;
  }

  if (operation.type === 'clear') {
    return { ...snapshot, epoch: operation.id, records: [] };
  }

  // 当前影片及其删除版本。
  const id = operation.type === 'save' ? operation.entry.id : operation.movieId;
  const old = snapshot.records.find((record) => record.id === id);

  if (operation.generation !== (old?.generation ?? 'initial')) {
    return snapshot;
  }

  // 本次真实观看操作的时序。
  const stamp = { at: operation.at, id: operation.id };
  let record: HistoryRecord;

  if (operation.type === 'remove') {
    record = {
      id,
      generation: operation.id,
      entry: null,
      stamp,
      episodeStamps: {},
    };
  } else {
    // 当前集独立合并，不上传旧快照内其他集的播放位置。
    const episode = String(operation.entry.episode);

    if (!newer(stamp, old?.episodeStamps[episode])) {
      return snapshot;
    }

    // 影片最近观看信息与各集进度分别比较时间。
    const latest = newer(stamp, old?.stamp);
    const metadata = latest || !old?.entry ? operation.entry : old.entry;
    // 资源更新可能缩减集数，保留的进度必须仍属于当前影片集数。
    const progress = Object.fromEntries(
      Object.entries({
        ...old?.entry?.progress,
        [episode]: operation.entry.progress[episode],
      }).filter(([key]) => Number(key) < metadata.episodes.length),
    );
    const episodeStamps = Object.fromEntries(
      Object.entries({ ...old?.episodeStamps, [episode]: stamp }).filter(
        ([key]) => Number(key) < metadata.episodes.length,
      ),
    );

    record = {
      id,
      generation: operation.generation,
      stamp: latest ? stamp : (old?.stamp ?? stamp),
      episodeStamps,
      entry: {
        ...metadata,
        watchedAt: latest ? operation.at : metadata.watchedAt,
        progress,
      },
    };
  }

  return {
    ...snapshot,
    records: [...snapshot.records.filter((item) => item.id !== id), record],
  };
};

// 对尚未确认的操作进行本地投影，刷新页面也不会丢失待同步删除。
export const projectHistory = (
  snapshot: HistorySnapshot,
  operations: HistoryOperation[],
) => operations.reduce(applyHistoryOperation, snapshot);

// 类型收窄与数据解析共用同一套 Zod 契约。
export const isHistoryEntry = (value: unknown): value is HistoryEntry =>
  historyEntrySchema.safeParse(value).success;
export const isHistoryOperation = (value: unknown): value is HistoryOperation =>
  historyOperationSchema.safeParse(value).success;
export const isHistorySnapshot = (value: unknown): value is HistorySnapshot =>
  historySnapshotSchema.safeParse(value).success;

// 较新的服务器快照胜出，相同版本只接受同一清空版本的快照。
export const mergeHistorySnapshots = (
  current: HistorySnapshot,
  incoming: HistorySnapshot,
): HistorySnapshot => {
  if (current.ownerId !== incoming.ownerId) {
    return current;
  }

  if (current.revision !== incoming.revision) {
    return current.revision > incoming.revision ? current : incoming;
  }

  return current.epoch === incoming.epoch ? incoming : current;
};
