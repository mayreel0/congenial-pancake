import { pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const reportTargetType = pgEnum('report_target_type', [
  'request',
  'reply',
]);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetType: reportTargetType('target_type').notNull(),
    // References requests.id or replies.id depending on targetType — no FK,
    // since a single column can't reference two different tables.
    targetId: uuid('target_id').notNull(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Duplicate reports from the same user must not inflate the auto-hide count
    // (3 distinct reporters — see docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md).
    unique('reports_target_reporter_unique').on(
      table.targetType,
      table.targetId,
      table.reporterId,
    ),
  ],
);
