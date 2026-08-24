import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';
import type { RequestRecord } from '../requests/requests.repository';
import type { ViewerIdentity } from '../requests/requests.repository';

export type CreateReplyInput = {
  requestId: string;
  body: string;
  authorId?: string;
  guestId?: string;
};

export type ReplyRecord = typeof replies.$inferSelect;
export type ReplyWithRequest = { reply: ReplyRecord; request: RequestRecord };

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

  // Counted across all requests, not just one — the guest reply cap is a
  // global-per-guestId budget (mirrors the guest request cap being global,
  // not per-anything), not a per-request allowance.
  async countByGuest(guestId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(replies)
      .where(eq(replies.guestId, guestId));
    return row?.value ?? 0;
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    await this.db.update(replies).set({ hidden }).where(eq(replies.id, id));
  }

  findMine(viewer: ViewerIdentity): Promise<ReplyWithRequest[]> {
    return this.db
      .select({ reply: replies, request: requests })
      .from(replies)
      .innerJoin(requests, eq(requests.id, replies.requestId))
      .where(
        viewer.authorId
          ? eq(replies.authorId, viewer.authorId)
          : eq(replies.guestId, viewer.guestId!),
      )
      .orderBy(asc(replies.createdAt));
  }
}
