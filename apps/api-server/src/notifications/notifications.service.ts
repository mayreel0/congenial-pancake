import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, filter, map } from 'rxjs';
import { NotificationNotFoundException } from '../common/exceptions/app.exception';
import type { Env } from '../config/env.schema';
import type { PagedResult, Pagination } from '../requests/requests.repository';
import {
  NotificationsRepository,
  type NotificationRecord,
  type NotificationWithRequest,
} from './notifications.repository';
import { WebPushService } from './web-push.service';

const REPLY_RECEIVED = 'reply_received';

type NotificationEvent = { userId: string; notification: NotificationRecord };

@Injectable()
export class NotificationsService {
  // In-memory fan-out for the SSE stream — single instance per API process.
  // A multi-instance deployment would miss an event created on a different
  // instance than the one holding a given user's open connection; the
  // polling endpoint (unreadCount) is the deliberate backstop for that gap
  // (see docs/decisions and the plan this shipped from) rather than
  // reaching for Redis pub/sub before there's a real need for it.
  private readonly events$ = new Subject<NotificationEvent>();

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly webPushService: WebPushService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async createReplyReceived(
    requestAuthorId: string,
    requestId: string,
    replyId: string,
  ): Promise<NotificationRecord> {
    const notification = await this.notificationsRepository.create({
      userId: requestAuthorId,
      type: REPLY_RECEIVED,
      requestId,
      replyId,
    });
    this.events$.next({ userId: requestAuthorId, notification });

    // Fire-and-forget — a slow/failing push service shouldn't hold up the
    // reply-submission request this is called from. WebPushService itself
    // already no-ops without configured VAPID keys and swallows
    // per-subscription failures, so nothing here needs its own try/catch.
    const webPublicUrl = this.config.get('WEB_PUBLIC_URL', { infer: true });
    void this.webPushService.sendToUser(requestAuthorId, {
      title: '온설',
      body: '답장이 도착했어요',
      url: `${webPublicUrl}/records/requests/${requestId}?replyId=${replyId}`,
    });

    return notification;
  }

  // GET /notifications/stream — one Observable per open SSE connection,
  // filtered down to just this viewer's own events from the shared subject.
  stream(userId: string): Observable<NotificationRecord> {
    return this.events$.pipe(
      filter((event) => event.userId === userId),
      map((event) => event.notification),
    );
  }

  findMine(
    userId: string,
    pagination: Pagination,
  ): Promise<PagedResult<NotificationWithRequest>> {
    return this.notificationsRepository.findMine(userId, pagination);
  }

  unreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  markAllRead(userId: string): Promise<void> {
    return this.notificationsRepository.markAllRead(userId);
  }

  async deleteOne(userId: string, id: string): Promise<void> {
    const deleted = await this.notificationsRepository.deleteOne(userId, id);
    if (!deleted) throw new NotificationNotFoundException();
  }

  deleteAll(userId: string): Promise<void> {
    return this.notificationsRepository.deleteAll(userId);
  }
}
