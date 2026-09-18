import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { pushSubscriptions } from '../database/schema';

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;

@Injectable()
export class PushSubscriptionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Upsert on endpoint — re-subscribing the same browser (e.g. after
  // clearing site data, or just calling subscribe() again) sends the same
  // endpoint back; this keeps the row's userId current rather than
  // erroring on the unique constraint or accumulating stale duplicates.
  async upsert(params: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }): Promise<void> {
    await this.db
      .insert(pushSubscriptions)
      .values(params)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: params.userId,
          p256dh: params.p256dh,
          auth: params.auth,
        },
      });
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  findByUserId(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }
}
