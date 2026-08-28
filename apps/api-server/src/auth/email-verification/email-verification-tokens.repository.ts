import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants';
import type { Database } from '../../database/database.types';
import { emailVerificationTokens } from '../../database/schema';

export type EmailVerificationToken =
  typeof emailVerificationTokens.$inferSelect;

@Injectable()
export class EmailVerificationTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<EmailVerificationToken> {
    const [row] = await this.db
      .insert(emailVerificationTokens)
      .values({ userId, tokenHash, expiresAt })
      .returning();
    return row;
  }

  findValidByHash(
    tokenHash: string,
  ): Promise<EmailVerificationToken | undefined> {
    return this.db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
      ),
    });
  }

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id));
  }
}
