import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
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

  // The endpoint alone identifies the row — but this is only ever called
  // from the DELETE /notifications/push-subscriptions request itself
  // (see the controller), driven by input an authenticated caller could
  // have gotten from anywhere (a proxy log, a shared device, a leaked
  // request). Scoping by the caller's own userId too means a valid
  // session can only ever remove its own subscriptions, never someone
  // else's just by knowing their endpoint value.
  async deleteByEndpointForUser(
    endpoint: string,
    userId: string,
  ): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId),
        ),
      );
  }

  // Bulk cleanup for WebPushService's expired-subscription handling
  // (batched into one DELETE rather than one per endpoint) — this path is
  // driven by the push service's own 404/410 response, not by user input,
  // so there's no equivalent ownership check needed here.
  async deleteByEndpoints(endpoints: string[]): Promise<void> {
    if (endpoints.length === 0) return;
    await this.db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, endpoints));
  }

  findByUserId(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }
}
