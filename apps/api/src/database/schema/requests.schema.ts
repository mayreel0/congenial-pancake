import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    body: text('body').notNull(),
    // Nullable: anonymous (guest) authors have no users row.
    authorId: uuid('author_id').references(() => users.id),
    // Set only when authorId is null — a client-generated id that lets an
    // anonymous author be identified across requests (e.g. for the
    // 1-request-per-guest limit) without a real account.
    guestId: text('guest_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set by moderation once 3 distinct users report this request; admin can restore.
    hidden: boolean('hidden').notNull().default(false),
    // Soft delete for admin "영구 삭제" — never a real row delete.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check(
      'requests_author_or_guest',
      sql`${table.authorId} is not null or ${table.guestId} is not null`,
    ),
    // Unique constraints ignore NULL, so this only applies to guest rows —
    // enforces "1 request per guest" at the DB level.
    unique('requests_guest_id_unique').on(table.guestId),
  ],
);
