import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { answerInteractions, requests } from '../database/schema';

export type AnswerInteraction = typeof answerInteractions.$inferSelect;

@Injectable()
export class AnswerInteractionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Skip is the only status a guest may ever have, so this is the one path
  // that needs a guestId branch — hold is always a member action.
  async upsertMemberSkip(requestId: string, authorId: string): Promise<void> {
    await this.db
      .insert(answerInteractions)
      .values({ requestId, authorId, status: 'skipped' })
      .onConflictDoUpdate({
        target: [answerInteractions.requestId, answerInteractions.authorId],
        set: { status: 'skipped' },
      });
  }

  async upsertGuestSkip(requestId: string, guestId: string): Promise<void> {
    await this.db
      .insert(answerInteractions)
      .values({ requestId, guestId, status: 'skipped' })
      .onConflictDoUpdate({
        target: [answerInteractions.requestId, answerInteractions.guestId],
        set: { status: 'skipped' },
      });
  }

  async upsertMemberHold(requestId: string, authorId: string): Promise<void> {
    await this.db
      .insert(answerInteractions)
      .values({ requestId, authorId, status: 'held' })
      .onConflictDoUpdate({
        target: [answerInteractions.requestId, answerInteractions.authorId],
        set: { status: 'held' },
      });
  }

  findHeldForAuthor(authorId: string) {
    return this.db
      .select({ request: requests })
      .from(answerInteractions)
      .innerJoin(requests, eq(requests.id, answerInteractions.requestId))
      .where(
        and(
          eq(answerInteractions.authorId, authorId),
          eq(answerInteractions.status, 'held'),
        ),
      );
  }

  async deleteForViewer(
    requestId: string,
    authorId: string | undefined,
    guestId: string | undefined,
  ): Promise<void> {
    if (authorId) {
      await this.db
        .delete(answerInteractions)
        .where(
          and(
            eq(answerInteractions.requestId, requestId),
            eq(answerInteractions.authorId, authorId),
          ),
        );
      return;
    }

    if (guestId) {
      await this.db
        .delete(answerInteractions)
        .where(
          and(
            eq(answerInteractions.requestId, requestId),
            eq(answerInteractions.guestId, guestId),
          ),
        );
    }
  }
}
