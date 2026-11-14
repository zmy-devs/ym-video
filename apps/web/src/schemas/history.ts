import { z } from 'zod';
import {
  historyOperationSchema,
  historySnapshotSchema,
} from '@ym-video/history';

// 云端确认快照在本机按账号隔离。
export const cachedHistorySchema = z
  .object({ ownerId: z.string(), snapshot: historySnapshotSchema })
  .refine((value) => value.ownerId === value.snapshot.ownerId);

// 持久化队列读取时一次验证归属、操作标识和因果序号。
export const queuedOperationSchema = z
  .object({
    key: z.string(),
    ownerId: z.string(),
    order: z.int().nonnegative(),
    operation: historyOperationSchema,
  })
  .refine((value) => value.key === `${value.ownerId}:${value.operation.id}`);

// 持久化类型沿用读取边界的校验规则。
export type CachedHistory = z.infer<typeof cachedHistorySchema>;
export type QueuedOperation = z.infer<typeof queuedOperationSchema>;
