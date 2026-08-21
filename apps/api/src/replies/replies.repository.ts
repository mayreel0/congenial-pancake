import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { replies } from '../database/schema';

export type CreateReplyInput = {
  requestId: string;
  body: string;
  authorId?: string;
  guestId?: string;
};

export type ReplyRecord = typeof replies.$inferSelect;

@Injectable()
export class RepliesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateReplyInput): Promise<ReplyRecord> {
    const [reply] = await this.db.insert(replies).values(input).returning();
    return reply;
  }

  findVisibleById(id: string): Promise<ReplyRecord | undefined> {
    return this.db.query.replies.findFirst({
      where: and(
        eq(replies.id, id),
        eq(replies.hidden, false),
        isNull(replies.deletedAt),
      ),
    });
  }

  findVisibleByRequestId(requestId: string): Promise<ReplyRecord[]> {
    return this.db.query.replies.findMany({
      where: and(
        eq(replies.requestId, requestId),
        eq(replies.hidden, false),
        isNull(replies.deletedAt),
      ),
      orderBy: desc(replies.createdAt),
    });
  }

  findByRequestAndAuthor(
    requestId: string,
    authorId: string,
  ): Promise<ReplyRecord | undefined> {
    return this.db.query.replies.findFirst({
      where: and(
        eq(replies.requestId, requestId),
        eq(replies.authorId, authorId),
      ),
    });
  }

  async countByRequestAndGuest(
    requestId: string,
    guestId: string,
  ): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(replies)
      .where(
        and(eq(replies.requestId, requestId), eq(replies.guestId, guestId)),
      );
    return row?.value ?? 0;
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    await this.db.update(replies).set({ hidden }).where(eq(replies.id, id));
  }
}
