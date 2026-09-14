import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { notifications } from '../database/schema';
import type { PagedResult, Pagination } from '../requests/requests.repository';

export type NotificationRecord = typeof notifications.$inferSelect;

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  create(params: {
    userId: string;
    type: string;
    requestId: string;
    replyId: string;
  }): Promise<NotificationRecord> {
    return this.db
      .insert(notifications)
      .values(params)
      .returning()
      .then((rows) => rows[0]);
  }

  async findMine(
    userId: string,
    { page, pageSize }: Pagination,
  ): Promise<PagedResult<NotificationRecord>> {
    const where = eq(notifications.userId, userId);
    const [items, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
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
}
