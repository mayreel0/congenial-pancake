import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  // For a future "내 로그인 기기" list — not read anywhere yet.
  userAgent: text('user_agent'),
});
