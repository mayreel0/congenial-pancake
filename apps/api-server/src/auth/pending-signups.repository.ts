import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { pendingSignups } from '../database/schema';

export type PendingSignup = typeof pendingSignups.$inferSelect;

@Injectable()
export class PendingSignupsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PendingSignup> {
    const [row] = await this.db
      .insert(pendingSignups)
      .values({ email, tokenHash, expiresAt })
      .returning();
    return row;
  }

  findValidByHash(tokenHash: string): Promise<PendingSignup | undefined> {
    return this.db.query.pendingSignups.findFirst({
      where: and(
        eq(pendingSignups.tokenHash, tokenHash),
        isNull(pendingSignups.usedAt),
        gt(pendingSignups.expiresAt, new Date()),
      ),
    });
  }

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(pendingSignups)
      .set({ usedAt: new Date() })
      .where(eq(pendingSignups.id, id));
  }
}
