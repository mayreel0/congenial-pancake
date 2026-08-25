import { sql } from 'drizzle-orm';
import {
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { requests } from './requests.schema';
import { users } from './users.schema';

export const answerInteractionStatus = pgEnum('answer_interaction_status', [
  'skipped',
  'held',
]);

// One row per (request, viewer) — a viewer excludes a request from their own
// /answer queue either by skipping it (guest or member) or holding it for
// later (member only; see docs/decisions for why). Never aggregated across
// viewers or used to rank a request for anyone else — see
// docs/decisions/2026-08-22-onseol-answer-queue-decisions.md.
export const answerInteractions = pgTable(
  'answer_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id),
    authorId: uuid('author_id').references(() => users.id),
    guestId: text('guest_id'),
    status: answerInteractionStatus('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'answer_interactions_author_or_guest',
      sql`${table.authorId} is not null or ${table.guestId} is not null`,
    ),
    // Holding requires an account — a guest row may only ever be 'skipped'.
    check(
      'answer_interactions_guest_skip_only',
      sql`${table.guestId} is null or ${table.status} = 'skipped'`,
    ),
    // At most one interaction row per viewer per request — plain unique
    // indexes ignore NULL, so these apply independently to member rows
    // (guest_id null) and guest rows (author_id null), same pattern as
    // requests/replies.
    unique('answer_interactions_request_author_unique').on(
      table.requestId,
      table.authorId,
    ),
    unique('answer_interactions_request_guest_unique').on(
      table.requestId,
      table.guestId,
    ),
  ],
);
