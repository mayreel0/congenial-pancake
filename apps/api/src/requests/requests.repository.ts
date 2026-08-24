import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  not,
  notInArray,
} from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { answerInteractions, replies, requests } from '../database/schema';
import { QUEUE_FRESHNESS_HOURS } from './queue-freshness.constant';

export type CreateRequestInput = {
  body: string;
  authorId?: string;
  guestId?: string;
};

export type RequestRecord = typeof requests.$inferSelect;
export type RequestWithReplyCount = RequestRecord & { replyCount: number };
export type ViewerIdentity = { authorId?: string; guestId?: string };
export type ReplyRecord = typeof replies.$inferSelect;
export type FeedItem = { request: RequestRecord; replies: ReplyRecord[] };

// See docs/decisions/2026-08-22-onseol-answer-queue-decisions.md.
const QUEUE_REPLY_CAP = 5;

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

  // /read shows only requests that have at least one visible reply, newest
  // request first, each with its full (visible) reply list oldest-first.
  // Two queries rather than one join-and-group-into-JSON query — same
  // clarity-over-cleverness call as findQueueCandidate below.
  async findFeed(): Promise<FeedItem[]> {
    const requestRows = await this.db
      .select({
        id: requests.id,
        body: requests.body,
        authorId: requests.authorId,
        guestId: requests.guestId,
        createdAt: requests.createdAt,
        hidden: requests.hidden,
        deletedAt: requests.deletedAt,
      })
      .from(requests)
      .innerJoin(
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

    if (requestRows.length === 0) return [];

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

    return requestRows.map((request) => ({
      request,
      replies: repliesByRequestId.get(request.id) ?? [],
    }));
  }

  findByGuestId(guestId: string): Promise<RequestRecord | undefined> {
    return this.db.query.requests.findFirst({
      where: eq(requests.guestId, guestId),
    });
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    await this.db.update(requests).set({ hidden }).where(eq(requests.id, id));
  }

  // The next request this viewer should be offered to answer: fresh
  // (within QUEUE_FRESHNESS_HOURS), not theirs, not already replied to or
  // skipped/held by them, fewest visible replies first (capped at
  // QUEUE_REPLY_CAP so replies spread out) with newest-first as the
  // tiebreak. Falls back to ignoring the cap only when every eligible
  // request has already hit it — see docs/decisions/2026-08-22-onseol-
  // answer-queue-decisions.md.
  async findQueueCandidate(
    viewer: ViewerIdentity,
  ): Promise<RequestWithReplyCount | undefined> {
    const excludedRequestIds = await this.findExcludedRequestIds(viewer);
    const selfAuthoredCondition = viewer.authorId
      ? eq(requests.authorId, viewer.authorId)
      : eq(requests.guestId, viewer.guestId!);
    const freshnessCutoff = new Date(
      Date.now() - QUEUE_FRESHNESS_HOURS * 60 * 60 * 1000,
    );

    const baseWhere = and(
      eq(requests.hidden, false),
      isNull(requests.deletedAt),
      gt(requests.createdAt, freshnessCutoff),
      not(selfAuthoredCondition),
      excludedRequestIds.length > 0
        ? notInArray(requests.id, excludedRequestIds)
        : undefined,
    );

    const capped = await this.queueCandidateQuery(baseWhere, true);
    if (capped) return capped;
    return this.queueCandidateQuery(baseWhere, false);
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
    applyCap: boolean,
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
      .having(applyCap ? lt(replyCount, QUEUE_REPLY_CAP) : undefined)
      .orderBy(replyCount, desc(requests.createdAt))
      .limit(1);

    return rows[0];
  }
}
