import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

// One row per browser/device the member has subscribed from — a member
// can have several open at once (phone + laptop), so this is 1:N off
// users, not a single column on it. `endpoint` is the push service URL
// the browser's PushManager returned; it's what makes a subscription
// unique (not userId alone) since the same member subscribing from a
// second device creates a second row, not a replacement.
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    endpoint: text('endpoint').notNull(),
    // web-push's applicationServerKey handshake — see PushSubscriptionJSON.keys.
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('push_subscriptions_endpoint_unique').on(table.endpoint),
    // findByUserId filters by this alone — Postgres doesn't auto-index a
    // foreign key the way it does a primary key, see notifications.schema.ts's
    // identical comment.
    index('push_subscriptions_user_id_idx').on(table.userId),
  ],
);
