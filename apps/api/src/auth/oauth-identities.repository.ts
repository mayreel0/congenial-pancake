import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { oauthIdentities, type oauthProvider } from '../database/schema';

type Provider = (typeof oauthProvider.enumValues)[number];
export type OAuthIdentity = typeof oauthIdentities.$inferSelect;

@Injectable()
export class OAuthIdentitiesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findByProviderAccount(
    provider: Provider,
    providerAccountId: string,
  ): Promise<OAuthIdentity | undefined> {
    return this.db.query.oauthIdentities.findFirst({
      where: and(
        eq(oauthIdentities.provider, provider),
        eq(oauthIdentities.providerAccountId, providerAccountId),
      ),
    });
  }

  async create(
    userId: string,
    provider: Provider,
    providerAccountId: string,
  ): Promise<OAuthIdentity> {
    const [identity] = await this.db
      .insert(oauthIdentities)
      .values({ userId, provider, providerAccountId })
      .returning();
    return identity;
  }
}
