import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

// Same shape as password_reset_tokens — a separate table rather than a
// shared generic "user tokens" table, matching this project's preference
// for one small table per concern over a shared table with a purpose enum.
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
