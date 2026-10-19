import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

// 使用时间独立于注册账号保留，删除账号不会恢复邀请的可用性。
export const invitation = sqliteTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().default(''),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at').notNull(),
    usedAt: integer('used_at'),
    usedById: text('used_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [index('invitation_created_at_idx').on(table.createdAt)],
);
