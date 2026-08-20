import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
} from 'drizzle-orm/pg-core';
import { requests } from './requests.schema';
import { users } from './users.schema';

export const replies = pgTable(
  'replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    hidden: boolean('hidden').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // R13/R14: one reply per request per user; many different users may still reply.
    unique('replies_request_author_unique').on(table.requestId, table.authorId),
  ],
);
