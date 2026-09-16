import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  ModerationCategory,
  ModerationExcludedReason,
} from '../../moderation/reply-content/reply-content-moderation.types';
import { replies } from './replies.schema';

export const replyModerationAction = pgEnum('reply_moderation_action', [
  'allow',
  'suggest_rewrite',
  'block',
  'uncertain',
]);

export const replyModerationExcludedReason = pgEnum(
  'reply_moderation_excluded_reason',
  ['load_test', 'seed_data', 'system_generated'],
);

export const replyModerationLogs = pgTable(
  'reply_moderation_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    replyId: uuid('reply_id')
      .notNull()
      .references(() => replies.id),
    action: replyModerationAction('action').notNull(),
    categories: jsonb('categories')
      .$type<ModerationCategory[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    severity: integer('severity').notNull(),
    confidence: real('confidence').notNull(),
    reason: text('reason').notNull(),
    suggestions: jsonb('suggestions')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    errorReason: text('error_reason'),
    shouldPersistForTraining: boolean('should_persist_for_training')
      .notNull()
      .default(true),
    excludedReason: replyModerationExcludedReason(
      'excluded_reason',
    ).$type<ModerationExcludedReason | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // findByReplyId and admin's 답변 관리 LEFT JOIN both filter/join on this
    // column — a foreign key alone doesn't get Postgres to index it.
    index('reply_moderation_logs_reply_id_idx').on(table.replyId),
  ],
);
