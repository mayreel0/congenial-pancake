import { pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { replies } from './replies.schema';
import { users } from './users.schema';

// "마음에 남기기" bookmark for /read — member-only per docs/decisions/2026-08-22-
// onseol-answer-queue-decisions.md ("저장(save)... 로그인 필수로 예정"), so unlike
// requests/replies there is no guestId column here.
export const savedReplies = pgTable(
  'saved_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    replyId: uuid('reply_id')
      .notNull()
      .references(() => replies.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('saved_replies_reply_author_unique').on(
      table.replyId,
      table.authorId,
    ),
  ],
);
