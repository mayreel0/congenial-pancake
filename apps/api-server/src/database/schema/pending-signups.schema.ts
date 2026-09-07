import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// No userId — that's the whole point. A users row only ever gets created
// once someone proves they own the email by consuming this token (see
// AuthService.completeSignup), so nobody can claim/squat an email before
// proving ownership of it. email is deliberately not unique: a lost-email
// retry just requests a fresh row via the same signup endpoint, and
// whichever valid token gets used first wins — the others simply expire.
export const pendingSignups = pgTable('pending_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
