import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, isNull, notExists, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';

export type LandingCounts = { today: number; month: number; total: number };

export type DateBoundaries = { todayStart: Date; monthStart: Date };

export type SampleExchangeRow = {
  request: { body: string; createdAt: Date };
  reply: { body: string; createdAt: Date };
};

@Injectable()
export class LandingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  countRequests(boundaries: DateBoundaries): Promise<LandingCounts> {
    return this.countRows(requests, boundaries);
  }

  countReplies(boundaries: DateBoundaries): Promise<LandingCounts> {
    return this.countRows(replies, boundaries);
  }

  // Shared by countRequests/countReplies — requests and replies have the
  // exact same hidden/deletedAt/createdAt shape for this purpose.
  private async countRows(
    table: typeof requests | typeof replies,
    { todayStart, monthStart }: DateBoundaries,
  ): Promise<LandingCounts> {
    const visible = and(eq(table.hidden, false), isNull(table.deletedAt));
    const [totalRow, monthRow, todayRow] = await Promise.all([
      this.db.select({ value: count() }).from(table).where(visible),
      this.db
        .select({ value: count() })
        .from(table)
        .where(and(visible, gte(table.createdAt, monthStart))),
      this.db
        .select({ value: count() })
        .from(table)
        .where(and(visible, gte(table.createdAt, todayStart))),
    ]);
    return {
      today: todayRow[0]?.value ?? 0,
      month: monthRow[0]?.value ?? 0,
      total: totalRow[0]?.value ?? 0,
    };
  }

  // Snapshot, not time-windowed: visible requests with zero visible replies
  // right now.
  async countWaitingForReply(): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(requests)
      .where(
        and(
          eq(requests.hidden, false),
          isNull(requests.deletedAt),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(replies)
              .where(
                and(
                  eq(replies.requestId, requests.id),
                  eq(replies.hidden, false),
                  isNull(replies.deletedAt),
                ),
              ),
          ),
        ),
      );
    return row?.value ?? 0;
  }

  async findSampleExchanges(limit: number): Promise<SampleExchangeRow[]> {
    const rows = await this.db
      .select({
        requestBody: requests.body,
        requestCreatedAt: requests.createdAt,
        replyBody: replies.body,
        replyCreatedAt: replies.createdAt,
      })
      .from(replies)
      .innerJoin(requests, eq(replies.requestId, requests.id))
      .where(
        and(
          eq(replies.hidden, false),
          isNull(replies.deletedAt),
          eq(requests.hidden, false),
          isNull(requests.deletedAt),
        ),
      )
      .orderBy(sql`random()`)
      .limit(limit);

    return rows.map((row) => ({
      request: { body: row.requestBody, createdAt: row.requestCreatedAt },
      reply: { body: row.replyBody, createdAt: row.replyCreatedAt },
    }));
  }
}
