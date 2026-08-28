import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  // Nullable: OAuth-only accounts (e.g. Google) have no password.
  passwordHash: text('password_hash'),
  // Self-chosen, NOT unique (see docs/decisions/2026-08-28-onseol-nickname-
  // decisions.md) — deliberately not derived from email/real name/OAuth
  // profile, shown only on posts where the author opted in for that
  // specific post (see docs/decisions/2026-08-28-onseol-nickname-post-
  // reveal-decisions.md). Duplicates are told apart in the UI by a
  // discriminator derived from `id` (see users/nickname-discriminator.ts)
  // rather than by forcing global uniqueness.
  nickname: text('nickname'),
  // Null until the first time nickname is set. Setting a nickname for the
  // first time (from null) is always free; every change after that is
  // rate-limited against this timestamp — see UsersService.updateNickname
  // and docs/decisions/2026-08-29-onseol-nickname-cooldown-decisions.md.
  nicknameChangedAt: timestamp('nickname_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
