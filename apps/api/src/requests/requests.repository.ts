import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { requests } from '../database/schema';

export type CreateRequestInput = {
  body: string;
  authorId?: string;
  guestId?: string;
};

export type RequestRecord = typeof requests.$inferSelect;

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

  findVisible(): Promise<RequestRecord[]> {
    return this.db.query.requests.findMany({
      where: and(eq(requests.hidden, false), isNull(requests.deletedAt)),
      orderBy: desc(requests.createdAt),
    });
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
