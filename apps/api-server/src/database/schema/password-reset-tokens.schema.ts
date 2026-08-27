import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

// Issued only from /admin (see AdminController.issuePasswordResetLink), not
// self-service — one-off way to give an OAuth-only account a password so
// it can log into apps/admin standalone. tokenHash is a plain sha256, not
// bcrypt: this needs an exact-match DB lookup by hash, not a
// slow/salted-per-call compare like a real password.
export const passwordResetTokens = pgTable('password_reset_tokens', {
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
