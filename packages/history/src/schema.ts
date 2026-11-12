import { z } from 'zod';
import type {
  HistoryEntry,
  HistoryOperation,
  HistorySnapshot,
} from './index.ts';

const text = z.string().max(512);
const version = z.string().min(1).max(128);
const time = z.number().nonnegative();
const httpUrl = z
  .url({ protocol: /^https?$/ })
  .max(4096)
  .pipe(
    z.string().refine((value) => {
      const url = new URL(value);
      return !url.username && !url.password;
    }),
  );
const stamp = z.object({ at: time, id: version });

// 客户端缓存与 API 使用相同的影片及逐集进度契约。
export const historyEntrySchema: z.ZodType<HistoryEntry> = z
  .object({
    id: z.string(),
    sourceId: version,
    vodId: version,
    name: text,
    pic: z.union([z.literal(''), httpUrl]),
    year: text,
    area: text,
    lang: text,
    category: text,
    remarks: text,
    episodes: z.array(z.object({ label: text, url: httpUrl })).max(2000),
    episode: z.int().nonnegative(),
    progress: z.record(
      z.string().regex(/^(0|[1-9]\d*)$/),
      z.object({
        currentTime: time,
        duration: time,
      }),
    ),
    watchedAt: time,
  })
  .refine((entry) => {
    try {
      return (
        entry.id ===
          `${encodeURIComponent(entry.sourceId)}:${encodeURIComponent(entry.vodId)}` &&
        entry.episode < entry.episodes.length &&
        Object.keys(entry.progress).every(
          (key) => Number(key) < entry.episodes.length,
        )
      );
    } catch {
      return false;
    }
  });

// 删除、清空和保存分别校验自己的版本关系。
export const historyOperationSchema: z.ZodType<HistoryOperation> =
  z.discriminatedUnion('type', [
    z
      .object({
        id: version,
        at: time,
        epoch: version,
        type: z.literal('save'),
        generation: version,
        entry: historyEntrySchema,
      })
      .refine((operation) =>
        Object.hasOwn(
          operation.entry.progress,
          String(operation.entry.episode),
        ),
      ),
    z
      .object({
        id: version,
        at: time,
        epoch: version,
        type: z.literal('remove'),
        generation: version,
        movieId: z.string().min(1).max(4096),
      })
      .refine((operation) => operation.id !== operation.generation),
    z
      .object({
        id: version,
        at: time,
        epoch: version,
        type: z.literal('clear'),
      })
      .refine((operation) => operation.id !== operation.epoch),
  ]);

// 云端快照中的记录 ID 必须与影片对应。
export const historySnapshotSchema: z.ZodType<HistorySnapshot> = z.object({
  ownerId: version,
  epoch: version,
  revision: z.int().nonnegative(),
  records: z.array(
    z
      .object({
        id: z.string().max(4096),
        generation: version,
        entry: historyEntrySchema.nullable(),
        stamp,
        episodeStamps: z.record(z.string(), stamp),
      })
      .refine(
        (record) => record.entry === null || record.entry.id === record.id,
      ),
  ),
});
