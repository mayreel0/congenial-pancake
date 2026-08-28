import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  // Nullable: OAuth-only accounts (e.g. Google) have no password.
  passwordHash: text('password_hash'),
  // Self-chosen, NOT unique (see docs/decisions/2026-08-28-onseol-nickname-
  // decisions.md) — deliberately not derived from email/real name/OAuth
  // profile, and never shown unless the author opts in per-post (a future
  // round; unused by anything yet). Duplicates are told apart in the UI by
  // a discriminator derived from `id` (see users/nickname-discriminator.ts)
  // rather than by forcing global uniqueness.
  nickname: text('nickname'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
