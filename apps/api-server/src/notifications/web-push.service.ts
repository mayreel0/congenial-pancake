import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { Env } from '../config/env.schema';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

// Deliberately generic notification text only (no reply/request body) —
// this is member-facing content that can land on a lock screen where
// anyone nearby can read it, and 온설's whole design leans anonymous/
// private (see docs/decisions' nickname-reveal and profile-privacy
// history). A content-preview option is a real future ask, but out of
// scope for this round — see sw.js's push handler for where the title/
// body actually render.
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly configured: boolean;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly pushSubscriptionsRepository: PushSubscriptionsRepository,
  ) {
    const publicKey = this.config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('VAPID_PRIVATE_KEY', { infer: true });
    this.configured = Boolean(publicKey && privateKey);

    // Boots fine without VAPID keys configured (same pattern as
    // EmailService's providers) — sendToUser below just no-ops. Only
    // call webpush.setVapidDetails when there's something valid to set,
    // since the library throws on empty strings.
    if (this.configured) {
      webpush.setVapidDetails(
        this.config.get('VAPID_SUBJECT', { infer: true }),
        publicKey,
        privateKey,
      );
    }
  }

  // Fans out to every device this member has subscribed from — a failed
  // send to one (network blip, that specific endpoint expired) doesn't
  // stop the others. A 404/410 means the push service itself says this
  // endpoint is gone for good (browser unsubscribed, storage cleared,
  // etc.), so that row is deleted rather than retried forever.
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.configured) return;

    const subscriptions =
      await this.pushSubscriptionsRepository.findByUserId(userId);
    if (subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(payload),
          );
        } catch (error) {
          const statusCode =
            error instanceof Error && 'statusCode' in error
              ? (error as { statusCode: number }).statusCode
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await this.pushSubscriptionsRepository.deleteByEndpoint(
              subscription.endpoint,
            );
            return;
          }
          this.logger.warn(
            `Push send failed for subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }),
    );
  }
}
