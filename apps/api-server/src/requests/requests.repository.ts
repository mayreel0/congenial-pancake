import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { answerInteractions, replies, requests } from '../database/schema';

export type CreateRequestInput = {
  body: string;
  authorId?: string;
  guestId?: string;
  anonymous?: boolean;
};

export type RequestRecord = typeof requests.$inferSelect;
export type RequestWithReplyCount = RequestRecord & { replyCount: number };
export type ViewerIdentity = { authorId?: string; guestId?: string };
export type ReplyRecord = typeof replies.$inferSelect;
export type FeedItem = { request: RequestRecord; replies: ReplyRecord[] };
export type PagedResult<T> = { items: T[]; totalItems: number };
export type DateRange = { start?: Date; end?: Date };
export type Pagination = { page: number; pageSize: number };
export type QueueCandidateLimits = {
  freshnessHours: number;
  replyCap: number;
};

// `start`/`end` are both optional (/records' date range defaults to
// unbounded) — undefined here means "no filter", not "match nothing".
function dateRangeCondition(
  column: typeof requests.createdAt,
  range: DateRange,
) {
  const conditions: SQL[] = [];
  if (range.start) conditions.push(gte(column, range.start));
  if (range.end) conditions.push(lt(column, range.end));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

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
        reviewedAt: requests.reviewedAt,
        anonymous: requests.anonymous,
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

  // /read shows only requests that have at least one visible reply, newest
  // request first, each with its full (visible) reply list oldest-first.
  // Two queries rather than one join-and-group-into-JSON query — same
  // clarity-over-cleverness call as findQueueCandidate below.
  async findFeed(
    range: DateRange,
    pagination: Pagination,
  ): Promise<PagedResult<FeedItem>> {
    const whereClause = and(
      eq(requests.hidden, false),
      isNull(requests.deletedAt),
      dateRangeCondition(requests.createdAt, range),
    );
    const replyJoinCondition = and(
      eq(replies.requestId, requests.id),
      eq(replies.hidden, false),
      isNull(replies.deletedAt),
    );

    const [{ value: totalItems }] = await this.db
      .select({ value: countDistinct(requests.id) })
      .from(requests)
      .innerJoin(replies, replyJoinCondition)
      .where(whereClause);

    if (totalItems === 0) return { items: [], totalItems: 0 };

    const requestRows = await this.db
      .select({
        id: requests.id,
        body: requests.body,
        authorId: requests.authorId,
        guestId: requests.guestId,
        createdAt: requests.createdAt,
        hidden: requests.hidden,
        deletedAt: requests.deletedAt,
        reviewedAt: requests.reviewedAt,
        anonymous: requests.anonymous,
      })
      .from(requests)
      .innerJoin(replies, replyJoinCondition)
      .where(whereClause)
      .groupBy(requests.id)
      .orderBy(desc(requests.createdAt))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    if (requestRows.length === 0) return { items: [], totalItems };

    const requestIds = requestRows.map((row) => row.id);
    const replyRows = await this.db.query.replies.findMany({
      where: and(
        inArray(replies.requestId, requestIds),
        eq(replies.hidden, false),
        isNull(replies.deletedAt),
      ),
      orderBy: asc(replies.createdAt),
    });

    const repliesByRequestId = new Map<string, ReplyRecord[]>();
    for (const reply of replyRows) {
      const list = repliesByRequestId.get(reply.requestId) ?? [];
      list.push(reply);
      repliesByRequestId.set(reply.requestId, list);
    }

    return {
      items: requestRows.map((request) => ({
        request,
        replies: repliesByRequestId.get(request.id) ?? [],
      })),
      totalItems,
    };
  }

  // "내 기록" → 내가 작성한 고민: every request this member posted, newest
  // first, with every reply nested oldest-first — no hidden/deletedAt
  // filtering on either side, matching RepliesRepository.findMine()'s
  // precedent that a viewer's own content is shown to them unfiltered.
  async findMine(
    authorId: string,
    range: DateRange,
    pagination: Pagination,
  ): Promise<PagedResult<FeedItem>> {
    const whereClause = and(
      eq(requests.authorId, authorId),
      dateRangeCondition(requests.createdAt, range),
    );

    const [{ value: totalItems }] = await this.db
      .select({ value: count(requests.id) })
      .from(requests)
      .where(whereClause);

    if (totalItems === 0) return { items: [], totalItems: 0 };

    const requestRows = await this.db
      .select({
        id: requests.id,
        body: requests.body,
        authorId: requests.authorId,
        guestId: requests.guestId,
        createdAt: requests.createdAt,
        hidden: requests.hidden,
        deletedAt: requests.deletedAt,
        reviewedAt: requests.reviewedAt,
        anonymous: requests.anonymous,
      })
      .from(requests)
      .where(whereClause)
      .orderBy(desc(requests.createdAt))
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);

    if (requestRows.length === 0) return { items: [], totalItems };

    const requestIds = requestRows.map((row) => row.id);
    const replyRows = await this.db.query.replies.findMany({
      where: inArray(replies.requestId, requestIds),
      orderBy: asc(replies.createdAt),
    });

    const repliesByRequestId = new Map<string, ReplyRecord[]>();
    for (const reply of replyRows) {
      const list = repliesByRequestId.get(reply.requestId) ?? [];
      list.push(reply);
      repliesByRequestId.set(reply.requestId, list);
    }

    return {
      items: requestRows.map((request) => ({
        request,
        replies: repliesByRequestId.get(request.id) ?? [],
      })),
      totalItems,
    };
  }

  // Public profile page: only requests this member chose to reveal
  // (anonymous: false) and that are still visible — mirrors findVisible's
  // hidden/deletedAt filtering (shown to *other* viewers, unlike findMine
  // which is the author's own unfiltered view).
  findPublicByAuthor(authorId: string): Promise<RequestRecord[]> {
    return this.db.query.requests.findMany({
      where: and(
        eq(requests.authorId, authorId),
        eq(requests.anonymous, false),
        eq(requests.hidden, false),
        isNull(requests.deletedAt),
      ),
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

  // Admin's "신고 검토" queue: auto-hidden and not (soft-)deleted, oldest
  // hidden first so the longest-standing reports get reviewed first.
  findHidden(): Promise<RequestRecord[]> {
    return this.db.query.requests.findMany({
      where: and(eq(requests.hidden, true), isNull(requests.deletedAt)),
      orderBy: asc(requests.createdAt),
    });
  }

  // Admin "복구" — unhides and stamps reviewedAt so a stale report from
  // before this review doesn't immediately re-trigger auto-hide.
  async restore(id: string): Promise<void> {
    await this.db
      .update(requests)
      .set({ hidden: false, reviewedAt: new Date() })
      .where(eq(requests.id, id));
  }

  // Admin "영구 삭제" — soft delete only, never a real row delete (see
  // requests.schema.ts's deletedAt comment).
  async softDelete(id: string): Promise<void> {
    await this.db
      .update(requests)
      .set({ deletedAt: new Date() })
      .where(eq(requests.id, id));
  }

  // The next request this viewer should be offered to answer: fresh
  // (within limits.freshnessHours), not theirs, not already replied to or
  // skipped/held by them, fewest visible replies first (capped at
  // limits.replyCap so replies spread out) with newest-first as the
  // tiebreak. Falls back to ignoring the cap only when every eligible
  // request has already hit it — see docs/decisions/2026-08-22-onseol-
  // answer-queue-decisions.md. limits comes from SettingsService via
  // RequestsService, not hardcoded here anymore — see docs/decisions/
  // 2026-08-26-onseol-db-backed-settings-decisions.md.
  async findQueueCandidate(
    viewer: ViewerIdentity,
    limits: QueueCandidateLimits,
  ): Promise<RequestWithReplyCount | undefined> {
    const excludedRequestIds = await this.findExcludedRequestIds(viewer);
    // NULL-safe "not self-authored": a member's requests have guestId NULL
    // and a guest's requests have authorId NULL, and SQL's `NOT (col = x)`
    // evaluates to NULL (excluded) rather than true for a NULL column — so
    // the naive `not(eq(...))` form was silently hiding every request
    // authored by the other identity type, not just the viewer's own.
    const notSelfAuthoredCondition = viewer.authorId
      ? or(isNull(requests.authorId), ne(requests.authorId, viewer.authorId))
      : or(isNull(requests.guestId), ne(requests.guestId, viewer.guestId!));
    const freshnessCutoff = new Date(
      Date.now() - limits.freshnessHours * 60 * 60 * 1000,
    );

    const baseWhere = and(
      eq(requests.hidden, false),
      isNull(requests.deletedAt),
      gt(requests.createdAt, freshnessCutoff),
      notSelfAuthoredCondition,
      excludedRequestIds.length > 0
        ? notInArray(requests.id, excludedRequestIds)
        : undefined,
    );

    const capped = await this.queueCandidateQuery(baseWhere, limits.replyCap);
    if (capped) return capped;
    return this.queueCandidateQuery(baseWhere, undefined);
  }

  private async findExcludedRequestIds(
    viewer: ViewerIdentity,
  ): Promise<string[]> {
    const identityFilter = <T extends { authorId: unknown; guestId: unknown }>(
      table: T,
    ) =>
      viewer.authorId
        ? eq(table.authorId as never, viewer.authorId)
        : eq(table.guestId as never, viewer.guestId!);

    const [repliedRows, interactionRows] = await Promise.all([
      this.db
        .select({ requestId: replies.requestId })
        .from(replies)
        .where(identityFilter(replies)),
      this.db
        .select({ requestId: answerInteractions.requestId })
        .from(answerInteractions)
        .where(identityFilter(answerInteractions)),
    ]);

    return [
      ...new Set([
        ...repliedRows.map((row) => row.requestId),
        ...interactionRows.map((row) => row.requestId),
      ]),
    ];
  }

  private async queueCandidateQuery(
    baseWhere: ReturnType<typeof and>,
    replyCap: number | undefined,
  ): Promise<RequestWithReplyCount | undefined> {
    const replyCount = count(replies.id);
    const rows = await this.db
      .select({
        id: requests.id,
        body: requests.body,
        authorId: requests.authorId,
        guestId: requests.guestId,
        createdAt: requests.createdAt,
        hidden: requests.hidden,
        deletedAt: requests.deletedAt,
        reviewedAt: requests.reviewedAt,
        anonymous: requests.anonymous,
        replyCount,
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
      .where(baseWhere)
      .groupBy(requests.id)
      .having(replyCap !== undefined ? lt(replyCount, replyCap) : undefined)
      .orderBy(replyCount, desc(requests.createdAt))
      .limit(1);

    return rows[0];
  }
}
