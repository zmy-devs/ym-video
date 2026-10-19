import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { user } from './auth';

// 每个账号使用独立的历史版本屏障。
export const userHistoryMeta = sqliteTable('user_history_meta', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  epoch: text('epoch').notNull(),
  revision: integer('revision').notNull().default(0),
});

// 每部影片一行，删除墓碑保留以阻止旧播放器恢复记录。
export const userHistory = sqliteTable(
  'user_history',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    generation: text('generation').notNull(),
    entry: text('entry'),
    stamp: text('stamp').notNull(),
    episodeStamps: text('episode_stamps').notNull(),
    version: text('version').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);
