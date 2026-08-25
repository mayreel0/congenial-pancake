import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const oauthProvider = pgEnum('oauth_provider', ['google']);

export const oauthIdentities = pgTable(
  'oauth_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: oauthProvider('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The same external account must not link to more than one onseol user.
    unique('oauth_identities_provider_account_unique').on(
      table.provider,
      table.providerAccountId,
    ),
  ],
);
