import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { replies } from './replies.schema';
import { requests } from './requests.schema';
import { users } from './users.schema';

// General-purpose notifications table — only 'reply_received' exists today,
// but `type` being a plain string means a future notification kind needs no
// schema change, just a new type value (+ new nullable reference columns if
// it points at something other than a request/reply, same nullable-pair
// style requests/replies already use for authorId/guestId).
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  requestId: uuid('request_id').references(() => requests.id),
  replyId: uuid('reply_id').references(() => replies.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
});
