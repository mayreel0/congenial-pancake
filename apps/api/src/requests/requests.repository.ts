import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';

export type CreateRequestInput = {
  body: string;
  authorId?: string;
  guestId?: string;
};

export type RequestRecord = typeof requests.$inferSelect;
export type RequestWithReplyCount = RequestRecord & { replyCount: number };

@Injectable()
export class RequestsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateRequestInput): Promise<RequestRecord> {
    const [request] = await this.db.insert(requests).values(input).returning();
    return request;
  }

  findVisibleById(id: string): Promise<RequestRecord | undefined> {
    return this.db.query.requests.findFirst({
      where: and(
        eq(requests.id, id),
        eq(requests.hidden, false),
        isNull(requests.deletedAt),
      ),
    });
  }

  findVisible(): Promise<RequestWithReplyCount[]> {
    return this.db
      .select({
        id: requests.id,
        body: requests.body,
        authorId: requests.authorId,
        guestId: requests.guestId,
        createdAt: requests.createdAt,
        hidden: requests.hidden,
        deletedAt: requests.deletedAt,
        replyCount: count(replies.id),
      })
      .from(requests)
      .leftJoin(
        replies,
        and(
          eq(replies.requestId, requests.id),
          eq(replies.hidden, false),
          isNull(replies.deletedAt),
        ),
      )
      .where(and(eq(requests.hidden, false), isNull(requests.deletedAt)))
      .groupBy(requests.id)
      .orderBy(desc(requests.createdAt));
  }

  findByGuestId(guestId: string): Promise<RequestRecord | undefined> {
    return this.db.query.requests.findFirst({
      where: eq(requests.guestId, guestId),
    });
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    await this.db.update(requests).set({ hidden }).where(eq(requests.id, id));
  }
}
