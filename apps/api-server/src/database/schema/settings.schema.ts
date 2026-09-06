import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  smallint,
  timestamp,
} from 'drizzle-orm/pg-core';

// Single-row table (id is always 1) holding the tunable limits admin can
// adjust without a redeploy — see docs/decisions/2026-08-25-onseol-api-
// rate-limiting-decisions.md and docs/decisions/2026-08-22-onseol-answer-
// queue-decisions.md for where these numbers originally came from. Guests'
// 1-request-total cap is NOT here — it's a DB unique constraint
// (`requests_guest_id_unique`), not a tunable number.
export const settings = pgTable(
  'settings',
  {
    id: smallint('id').primaryKey().default(1),
    queueFreshnessHours: integer('queue_freshness_hours').notNull().default(60),
    queueReplyCap: integer('queue_reply_cap').notNull().default(5),
    guestReplyLimit: integer('guest_reply_limit').notNull().default(5),
    // See docs/decisions/2026-08-29-onseol-nickname-cooldown-decisions.md —
    // originally a hardcoded 7, moved here so admin can tune it without a
    // redeploy, same as the other three.
    nicknameCooldownDays: integer('nickname_cooldown_days')
      .notNull()
      .default(7),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check('settings_single_row', sql`${table.id} = 1`)],
);
