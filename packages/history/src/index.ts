// Web 与 API 共用的影片及历史契约。
export interface Episode {
  label: string;
  url: string;
}

export interface Movie {
  id: string;
  vodId: string;
  sourceId: string;
  name: string;
  pic: string;
  content: string;
  year: string;
  area: string;
  lang: string;
  category: string;
  remarks: string;
  episodes: Episode[];
}

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

// 接口和缓存边界均按未知输入校验。
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown, max = 512): value is string =>
  typeof value === 'string' && value.length <= max;

const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isVersion = (value: unknown): value is string =>
  isText(value, 128) && value.length > 0;

const isHttpUrl = (value: string) => {
  try {
    // 历史数据仅用于展示及浏览器直连媒体。
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

export const isHistoryEntry = (value: unknown): value is HistoryEntry => {
  if (
    !isObject(value) ||
    !isVersion(value.sourceId) ||
    !isVersion(value.vodId)
  ) {
    return false;
  }

  let expectedId: string;
  try {
    expectedId = `${encodeURIComponent(value.sourceId)}:${encodeURIComponent(value.vodId)}`;
  } catch {
    return false;
  }

  if (
    value.id !== expectedId ||
    !['name', 'year', 'area', 'lang', 'category', 'remarks'].every((key) =>
      isText(value[key]),
    ) ||
    !isText(value.content, 32_768) ||
    !isText(value.pic, 4096) ||
    (value.pic !== '' && !isHttpUrl(value.pic)) ||
    !Number.isInteger(value.episode) ||
    Number(value.episode) < 0 ||
    !isTime(value.watchedAt) ||
    !Array.isArray(value.episodes) ||
    value.episodes.length > 2000 ||
    Number(value.episode) >= value.episodes.length ||
    !isObject(value.progress)
  ) {
    return false;
  }

  const episodes = value.episodes;
  return (
    episodes.every(
      (episode) =>
        isObject(episode) &&
        isText(episode.label) &&
        isText(episode.url, 4096) &&
        isHttpUrl(episode.url),
    ) &&
    Object.entries(value.progress).every(
      ([episode, progress]) =>
        /^(0|[1-9]\d*)$/.test(episode) &&
        Number(episode) < episodes.length &&
        isObject(progress) &&
        isTime(progress.currentTime) &&
        isTime(progress.duration),
    )
  );
};

export const isHistoryOperation = (
  value: unknown,
): value is HistoryOperation => {
  if (
    !isObject(value) ||
    !isVersion(value.id) ||
    !isVersion(value.epoch) ||
    !isTime(value.at)
  ) {
    return false;
  }

  if (value.type === 'clear') {
    return value.id !== value.epoch;
  }

  if (!isVersion(value.generation)) {
    return false;
  }

  if (value.type === 'remove') {
    return (
      isText(value.movieId, 4096) &&
      value.movieId.length > 0 &&
      value.id !== value.generation
    );
  }

  return (
    value.type === 'save' &&
    isHistoryEntry(value.entry) &&
    Object.hasOwn(value.entry.progress, String(value.entry.episode))
  );
};

// 回包及 IndexedDB 快照不能绕过与请求相同的输入边界。
export const isHistorySnapshot = (value: unknown): value is HistorySnapshot =>
  isObject(value) &&
  isVersion(value.ownerId) &&
  isVersion(value.epoch) &&
  Number.isSafeInteger(value.revision) &&
  Number(value.revision) >= 0 &&
  Array.isArray(value.records) &&
  value.records.every(
    (record) =>
      isObject(record) &&
      isText(record.id, 4096) &&
      isVersion(record.generation) &&
      (record.entry === null ||
        (isHistoryEntry(record.entry) && record.entry.id === record.id)) &&
      isObject(record.stamp) &&
      isTime(record.stamp.at) &&
      isVersion(record.stamp.id) &&
      isObject(record.episodeStamps) &&
      Object.values(record.episodeStamps).every(
        (stamp) => isObject(stamp) && isTime(stamp.at) && isVersion(stamp.id),
      ),
  );

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
