import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  // Null = unverified. OAuth signups get this stamped immediately (the
  // provider already vouched for the email). Password signups can no
  // longer exist unverified — a `users` row is only created once someone
  // consumes a pending_signups token, at which point this is stamped in
  // the same step (see AuthService.completeSignup and
  // docs/decisions/2026-09-08-onseol-signup-redesign-decisions.md). Stays
  // nullable purely for legacy rows created before that redesign; login
  // is refused outright if this is null (EmailNotVerifiedException).
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  // Null until the first time nickname is set. Setting a nickname for the
  // first time (from null) is always free; every change after that is
  // rate-limited against this timestamp — see UsersService.updateNickname
  // and docs/decisions/2026-08-29-onseol-nickname-cooldown-decisions.md.
  nicknameChangedAt: timestamp('nickname_changed_at', { withTimezone: true }),
  // Independent public-profile (/u/[slug]) visibility switches — all
  // default true (opt-out, not opt-in) since a member who's already
  // revealing their nickname per-post has implicitly signaled they're okay
  // being found. showCountsOnProfile is deliberately separate from the two
  // list toggles (not derived from them) — a member can show activity
  // counts as a trust signal while keeping the actual content hidden, or
  // vice versa. See docs/decisions/2026-08-30-onseol-profile-privacy-
  // decisions.md.
  showRequestsOnProfile: boolean('show_requests_on_profile')
    .notNull()
    .default(true),
  showRepliesOnProfile: boolean('show_replies_on_profile')
    .notNull()
    .default(true),
  showCountsOnProfile: boolean('show_counts_on_profile')
    .notNull()
    .default(true),
  // Whether the nickname is shown to anyone but the owner — a pure
  // visibility switch, deliberately NOT the same as clearing/changing the
  // nickname text. Toggling this doesn't touch `nickname` or
  // `nicknameChangedAt`, so it never resets or bypasses the change
  // cooldown; the underlying nickname (and its cooldown clock) is exactly
  // as if this toggle didn't exist. See UsersService.nicknameMapFor and
  // docs/decisions/2026-08-30-onseol-profile-privacy-decisions.md.
  nicknameVisible: boolean('nickname_visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Withdrawal (회원탈퇴). Null = active account. Set alone = pending
  // deletion, a 30-day grace period during which login still succeeds
  // normally (see AuthController.me) — the frontend gates on
  // deletionGracePeriodEndsAt and blocks with a restore-or-log-out dialog
  // rather than silently reactivating the account. Nothing is scrubbed
  // yet at this point; email/nickname/password/oauth_identities are all
  // still intact so a restore is a no-op besides clearing this column.
  deletionRequestedAt: timestamp('deletion_requested_at', {
    withTimezone: true,
  }),
  // Set once the account is actually finalized — either immediately
  // (UsersService.scrubForDeletion called straight from the withdrawal
  // request) or by AccountDeletionCronService once deletionRequestedAt is
  // more than 30 days old. At that point email/nickname/passwordHash are
  // scrubbed (see UsersService.scrubForDeletion) and oauth_identities rows
  // are gone — requests/replies authored by this user are deliberately
  // NOT touched (can't null author_id — see the requests_author_or_guest/
  // replies_author_or_guest CHECK constraints — and don't need to: they
  // already re-render as anonymous once nickname is null, via
  // toAuthorDisplayDto's existing "opted in but nickname gone" fallback).
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
