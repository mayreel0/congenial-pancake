import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
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
    // Nullable: anonymous (guest) authors have no users row.
    authorId: uuid('author_id').references(() => users.id),
    // Set only when authorId is null. Unlike requests.guestId, there is no
    // DB-level uniqueness for this — guests may reply up to 5 times per
    // request (enforced in RepliesService), while logged-in users stay
    // capped at exactly 1 via the unique constraint below.
    guestId: text('guest_id'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    hidden: boolean('hidden').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    // See requests.schema.ts's reviewedAt — same purpose.
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    // See requests.schema.ts's anonymous — same per-post reveal choice,
    // same default, same guest restriction.
    anonymous: boolean('anonymous').notNull().default(true),
  },
  (table) => [
    check(
      'replies_author_or_guest',
      sql`${table.authorId} is not null or ${table.guestId} is not null`,
    ),
    check(
      'replies_guest_must_be_anonymous',
      sql`${table.authorId} is not null or ${table.anonymous} = true`,
    ),
    // R13/R14: one reply per request per logged-in user; doesn't constrain
    // guest rows (authorId is null there) — see RepliesService for the
    // guest limit. Many different users may still reply.
    unique('replies_request_author_unique').on(table.requestId, table.authorId),
    // findMine/countByGuest/findExcludedRequestIds all filter by
    // authorId/guestId alone (no requestId) — the composite unique index
    // above only helps when requestId leads the lookup, so these
    // standalone indexes are what keeps those queries off a full table
    // scan as replies grows.
    index('replies_author_id_idx').on(table.authorId),
    index('replies_guest_id_idx').on(table.guestId),
  ],
);
