import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  body: text('body').notNull(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Set by moderation once 3 distinct users report this request; admin can restore.
  hidden: boolean('hidden').notNull().default(false),
  // Soft delete for admin "영구 삭제" — never a real row delete.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
