import {
  applyHistoryOperation,
  HISTORY_ENTRY_MAX_BYTES,
  isHistoryOperation,
  isHistorySnapshot,
} from '@ym-video/history';
import type {
  HistoryOperation,
  HistoryRecord,
  HistorySnapshot,
} from '@ym-video/history';
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth/auth';
import { requireUser } from '../auth/guard';
import { HttpError } from '../../errors';

// 控制单次同步的操作数，请求体另由 Fastify 限制大小。
const MAX_OPERATIONS = 20;
type StoredHistory = {
  id: string;
  generation: string;
  entry: string | null;
  stamp: string;
  episode_stamps: string;
  version: string;
  updated_at: number;
};

type StoredMeta = {
  epoch: string;
  revision: number;
};

// 为首次登录账号创建版本屏障。
const ensureMeta = async (db: D1Database, userId: string) => {
  await db
    .prepare(
      "INSERT OR IGNORE INTO user_history_meta (user_id, epoch, revision) VALUES (?, 'initial', 0)",
    )
    .bind(userId)
    .run();
};

// 获取账号的历史版本屏障。
const readMeta = async (
  db: D1Database,
  userId: string,
): Promise<StoredMeta> => {
  const result = await db
    .prepare('SELECT epoch, revision FROM user_history_meta WHERE user_id = ?')
    .bind(userId)
    .first<StoredMeta>();

  if (!result) {
    throw new Error('观看历史版本不存在');
  }

  return result;
};

// 获取单条影片记录供条件更新使用。
const readRecord = (db: D1Database, userId: string, id: string) =>
  db
    .prepare(
      'SELECT id, generation, entry, stamp, episode_stamps, version, updated_at FROM user_history WHERE user_id = ? AND id = ?',
    )
    .bind(userId, id)
    .first<StoredHistory>();

// D1 只存 JSON 文本，解析失败视为数据库损坏并通过统一错误处理。
const parseRecord = (row: StoredHistory): HistoryRecord => {
  const snapshot: unknown = {
    ownerId: 'validation',
    epoch: 'initial',
    revision: 0,
    records: [
      {
        id: row.id,
        generation: row.generation,
        entry: row.entry === null ? null : JSON.parse(row.entry),
        stamp: JSON.parse(row.stamp),
        episodeStamps: JSON.parse(row.episode_stamps),
      },
    ],
  };
  if (!isHistorySnapshot(snapshot)) {
    throw new Error('观看历史数据损坏');
  }
  return snapshot.records[0];
};

// 读取当前账号的完整历史。
const readSnapshot = async (
  db: D1Database,
  userId: string,
): Promise<HistorySnapshot> => {
  await ensureMeta(db, userId);
  const [metaResult, historyResult] = await db.batch([
    db
      .prepare(
        'SELECT epoch, revision FROM user_history_meta WHERE user_id = ?',
      )
      .bind(userId),
    db
      .prepare(
        'SELECT id, generation, entry, stamp, episode_stamps, version, updated_at FROM user_history WHERE user_id = ? ORDER BY updated_at DESC',
      )
      .bind(userId),
  ]);
  const meta = metaResult.results[0] as StoredMeta | undefined;
  if (!meta) {
    throw new Error('观看历史版本不存在');
  }

  return {
    ownerId: userId,
    epoch: meta.epoch,
    revision: meta.revision,
    records: historyResult.results.map((value) =>
      parseRecord(value as StoredHistory),
    ),
  };
};

// 校验影片标识和请求值，再进入 D1 更新。
const validateOperation = (value: unknown): HistoryOperation => {
  if (!isHistoryOperation(value)) {
    throw new HttpError(400, 'INVALID_HISTORY', '观看历史格式不正确');
  }

  if (value.at > Date.now() + 300_000) {
    throw new HttpError(400, 'INVALID_HISTORY', '观看时间超出允许范围');
  }

  if (value.type === 'remove') {
    const [sourceId, vodId, ...extra] = value.movieId.split(':');
    if (!sourceId || !vodId || extra.length) {
      throw new HttpError(400, 'INVALID_HISTORY', '影片标识格式不正确');
    }
    try {
      if (
        encodeURIComponent(decodeURIComponent(sourceId)) !== sourceId ||
        encodeURIComponent(decodeURIComponent(vodId)) !== vodId
      ) {
        throw new Error('invalid movie id');
      }
    } catch {
      throw new HttpError(400, 'INVALID_HISTORY', '影片标识格式不正确');
    }
  }

  if (value.type === 'save') {
    const entryBytes = new TextEncoder().encode(
      JSON.stringify(value.entry),
    ).byteLength;
    if (entryBytes > HISTORY_ENTRY_MAX_BYTES) {
      throw new HttpError(
        413,
        'HISTORY_TOO_LARGE',
        '影片集数过多，无法保存到云端',
      );
    }
  }

  return value;
};

// 读取当前版本并条件提交，遇到并发更新时重新合并。
const applyOperation = async (
  db: D1Database,
  userId: string,
  operation: HistoryOperation,
) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const meta = await readMeta(db, userId);
    if (operation.epoch !== meta.epoch) {
      if (operation.type === 'clear' && operation.id === meta.epoch) {
        return;
      }
      return;
    }

    if (operation.type === 'clear') {
      // batch 原子执行；先按旧版本删除，再推进版本，重复请求不能删掉清空后新建的记录。
      const results = await db.batch([
        db
          .prepare(
            'DELETE FROM user_history WHERE user_id = ? AND EXISTS (SELECT 1 FROM user_history_meta WHERE user_id = ? AND epoch = ?)',
          )
          .bind(userId, userId, operation.epoch),
        db
          .prepare(
            'UPDATE user_history_meta SET epoch = ?, revision = revision + 1 WHERE user_id = ? AND epoch = ?',
          )
          .bind(operation.id, userId, operation.epoch),
      ]);

      if (
        results[1].meta.changes ||
        (await readMeta(db, userId)).epoch === operation.id
      ) {
        return;
      }
      continue;
    }

    const currentRow = await readRecord(
      db,
      userId,
      operation.type === 'save' ? operation.entry.id : operation.movieId,
    );
    const currentRecord = currentRow ? parseRecord(currentRow) : null;
    const snapshot: HistorySnapshot = {
      ownerId: userId,
      epoch: meta.epoch,
      revision: meta.revision,
      records: currentRecord ? [currentRecord] : [],
    };
    const next = applyHistoryOperation(snapshot, operation);
    if (next === snapshot) {
      return;
    }

    const record = next.records[0];
    if (!record) {
      return;
    }
    const entryJson =
      record.entry === null ? null : JSON.stringify(record.entry);
    const stampJson = JSON.stringify(record.stamp);
    const episodeStampsJson = JSON.stringify(record.episodeStamps);
    const expectedVersion = currentRow?.version ?? null;
    const write = db
      .prepare(
        `INSERT INTO user_history (user_id, id, generation, entry, stamp, episode_stamps, version, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM user_history_meta WHERE user_id = ? AND epoch = ?)
         ON CONFLICT(user_id, id) DO UPDATE SET
           generation = excluded.generation,
           entry = excluded.entry,
           stamp = excluded.stamp,
           episode_stamps = excluded.episode_stamps,
           version = excluded.version,
           updated_at = excluded.updated_at
         WHERE user_history.version IS ? AND user_history.generation = ?
           AND EXISTS (SELECT 1 FROM user_history_meta WHERE user_id = ? AND epoch = ?)`,
      )
      .bind(
        userId,
        record.id,
        record.generation,
        entryJson,
        stampJson,
        episodeStampsJson,
        operation.id,
        operation.at,
        userId,
        operation.epoch,
        expectedVersion,
        currentRow?.generation ?? 'initial',
        userId,
        operation.epoch,
      );
    const bumpRevision = db
      .prepare(
        'UPDATE user_history_meta SET revision = revision + 1 WHERE user_id = ? AND epoch = ? AND EXISTS (SELECT 1 FROM user_history WHERE user_id = ? AND id = ? AND version = ?)',
      )
      .bind(userId, operation.epoch, userId, record.id, operation.id);
    const results = await db.batch([write, bumpRevision]);

    if (results[0].meta.changes) {
      return;
    }
  }

  throw new HttpError(409, 'HISTORY_CONFLICT', '观看历史正在更新，请重试');
};

// 只处理登录账号的历史，客户端不能指定其他用户的存储范围。
export const registerUserDataRoutes = (
  app: FastifyInstance,
  auth: Auth,
  db: D1Database,
) => {
  app.get('/api/v1/history', async (request) => {
    const { user } = await requireUser(auth, request);
    return readSnapshot(db, user.id);
  });

  app.post(
    '/api/v1/history/sync',
    { bodyLimit: 1_000_000 },
    async (request) => {
      const { user } = await requireUser(auth, request);
      const body: unknown = request.body;
      if (
        typeof body !== 'object' ||
        body === null ||
        !('ownerId' in body) ||
        body.ownerId !== user.id ||
        !('operations' in body) ||
        !Array.isArray(body.operations) ||
        body.operations.length > MAX_OPERATIONS
      ) {
        if (
          typeof body === 'object' &&
          body !== null &&
          'ownerId' in body &&
          body.ownerId !== user.id
        ) {
          throw new HttpError(
            409,
            'ACCOUNT_CHANGED',
            '当前账号已切换，请刷新后重试',
          );
        }
        throw new HttpError(400, 'INVALID_HISTORY', '同步请求格式不正确');
      }

      const operations = body.operations.map(validateOperation);
      await ensureMeta(db, user.id);
      for (const operation of operations) {
        await applyOperation(db, user.id, operation);
      }

      return readSnapshot(db, user.id);
    },
  );
};
