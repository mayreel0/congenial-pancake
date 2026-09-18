import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { notifications, requests } from '../database/schema';
import type { PagedResult, Pagination } from '../requests/requests.repository';

export type NotificationRecord = typeof notifications.$inferSelect;

// findMine's item shape — the joined request's body/contentRemoved, not
// yet run through visibleRequestBody() (that happens at the DTO layer,
// same as every other response mapper — see common/request-content.ts).
// Both null for a notification with no linked request (e.g. 'test').
export type NotificationWithRequest = NotificationRecord & {
  requestBody: string | null;
  requestContentRemoved: boolean | null;
};

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  create(params: {
    userId: string;
    type: string;
    requestId: string | null;
    replyId: string | null;
  }): Promise<NotificationRecord> {
    return this.db
      .insert(notifications)
      .values(params)
      .returning()
      .then((rows) => rows[0]);
  }

  // Left join — 'reply_received' always has a requestId (so the list can
  // show which of the viewer's own posts got the reply), but 'test' has
  // none, and an inner join here would silently drop those rows from the
  // list entirely rather than show them with no linked post.
  async findMine(
    userId: string,
    { page, pageSize }: Pagination,
  ): Promise<PagedResult<NotificationWithRequest>> {
    const where = eq(notifications.userId, userId);
    const [items, [{ count }]] = await Promise.all([
      this.db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          type: notifications.type,
          requestId: notifications.requestId,
          replyId: notifications.replyId,
          createdAt: notifications.createdAt,
          readAt: notifications.readAt,
          requestBody: requests.body,
          requestContentRemoved: requests.contentRemoved,
        })
        .from(notifications)
        .leftJoin(requests, eq(requests.id, notifications.requestId))
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(where),
    ]);
    return { items, totalItems: count };
  }

  async countUnread(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
    return row?.count ?? 0;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
  }

  // Hard delete — notifications carry no content worth a soft-delete
  // placeholder (see requests/replies' contentRemoved for the contrast:
  // those still show a thread to other people, a notification is
  // viewer-only). Returns whether a row actually matched, scoped by
  // userId in the same query so a non-owner id and a nonexistent id are
  // indistinguishable to the caller.
  async deleteOne(userId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });
    return deleted.length > 0;
  }

  async deleteAll(userId: string): Promise<void> {
    await this.db.delete(notifications).where(eq(notifications.userId, userId));
  }
}
