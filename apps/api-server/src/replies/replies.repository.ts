import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { replies, requests } from '../database/schema';
import type {
  DateRange,
  DayCount,
  PagedResult,
  Pagination,
  RequestRecord,
} from '../requests/requests.repository';
import type { ViewerIdentity } from '../requests/requests.repository';

export type CreateReplyInput = {
  requestId: string;
  body: string;
  authorId?: string;
  guestId?: string;
  anonymous?: boolean;
};

export type ReplyRecord = typeof replies.$inferSelect;
export type ReplyWithRequest = { reply: ReplyRecord; request: RequestRecord };

// `start`/`end` are both optional (/records' date range defaults to
// unbounded) — undefined here means "no filter", not "match nothing".
function dateRangeCondition(
  column: typeof replies.createdAt,
  range: DateRange,
) {
  const conditions: SQL[] = [];
  if (range.start) conditions.push(gte(column, range.start));
  if (range.end) conditions.push(lt(column, range.end));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

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

  // Admin's "신고 검토" queue — joined with its request so the admin has
  // context for what was replied to, oldest hidden first.
  findHidden(): Promise<ReplyWithRequest[]> {
    return this.db
      .select({ reply: replies, request: requests })
      .from(replies)
      .innerJoin(requests, eq(requests.id, replies.requestId))
      .where(and(eq(replies.hidden, true), isNull(replies.deletedAt)))
      .orderBy(asc(replies.createdAt));
  }

  async restore(id: string): Promise<void> {
    await this.db
      .update(replies)
      .set({ hidden: false, reviewedAt: new Date() })
      .where(eq(replies.id, id));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(replies)
      .set({ deletedAt: new Date() })
      .where(eq(replies.id, id));
  }

  async findMine(
    viewer: ViewerIdentity,
    range: DateRange,
    pagination: Pagination,
  ): Promise<PagedResult<ReplyWithRequest>> {
    const identityCondition = viewer.authorId
      ? eq(replies.authorId, viewer.authorId)
      : eq(replies.guestId, viewer.guestId!);
    const whereClause = and(
      identityCondition,
      dateRangeCondition(replies.createdAt, range),
    );

    const [{ value: totalItems }] = await this.db
      .select({ value: count(replies.id) })
      .from(replies)
      .where(whereClause);

    if (totalItems === 0) return { items: [], totalItems: 0 };

    const items = await this.db
      .select({ reply: replies, request: requests })
      .from(replies)
      .innerJoin(requests, eq(requests.id, replies.requestId))
      .where(whereClause)
      // Newest first — matches RequestsRepository.findMine's convention
      // that page 1 shows the most recent activity, unlike the old
      // oldest-first order this used to have (nothing outside /records
      // relied on the previous ascending order).
      .orderBy(desc(replies.createdAt))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    return { items, totalItems };
  }

  // HeatmapCalendar for /records' 내가 남긴 답변 tab: per-KST-day count of
  // this viewer's own replies, unfiltered by hidden/deletedAt — mirrors
  // findMine's "viewer's own content shown unfiltered" policy. Same
  // authorId-or-guestId identity as findMine since guests can reply too.
  async countMineByDay(
    viewer: ViewerIdentity,
    range: DateRange,
  ): Promise<DayCount[]> {
    const dayBucket = sql<string>`to_char(${replies.createdAt} at time zone 'Asia/Seoul', 'YYYY-MM-DD')`;
    const identityCondition = viewer.authorId
      ? eq(replies.authorId, viewer.authorId)
      : eq(replies.guestId, viewer.guestId!);
    const whereClause = and(
      identityCondition,
      dateRangeCondition(replies.createdAt, range),
    );
    const rows = await this.db
      .select({ date: dayBucket, count: count(replies.id) })
      .from(replies)
      .where(whereClause)
      .groupBy(dayBucket);
    return rows;
  }

  // Public profile page: only replies this member chose to reveal
  // (anonymous: false) on a request that's itself still visible — a
  // revealed reply on a since-hidden/deleted request must not resurface it
  // via someone's profile. Unlike findMine, this is shown to *other*
  // viewers, so both hidden/deletedAt filters apply (findMine's "show the
  // viewer their own content unfiltered" policy doesn't extend to
  // strangers). Paginated for the same reason as
  // RequestsRepository.findPublicByAuthor — the main profile endpoint uses
  // a small preview page but still needs the real totalItems for its
  // count, the dedicated list endpoint uses the caller's page/pageSize.
  async findPublicByAuthor(
    authorId: string,
    pagination: Pagination,
  ): Promise<PagedResult<ReplyWithRequest>> {
    const whereClause = and(
      eq(replies.authorId, authorId),
      eq(replies.anonymous, false),
      eq(replies.hidden, false),
      isNull(replies.deletedAt),
      eq(requests.hidden, false),
      isNull(requests.deletedAt),
    );

    const [{ value: totalItems }] = await this.db
      .select({ value: count() })
      .from(replies)
      .innerJoin(requests, eq(requests.id, replies.requestId))
      .where(whereClause);

    if (totalItems === 0) return { items: [], totalItems: 0 };

    const items = await this.db
      .select({ reply: replies, request: requests })
      .from(replies)
      .innerJoin(requests, eq(requests.id, replies.requestId))
      .where(whereClause)
      .orderBy(desc(replies.createdAt))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    return { items, totalItems };
  }
}
