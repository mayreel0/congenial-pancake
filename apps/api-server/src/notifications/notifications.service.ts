import { Injectable } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import type { PagedResult, Pagination } from '../requests/requests.repository';
import {
  NotificationsRepository,
  type NotificationRecord,
  type NotificationWithRequest,
} from './notifications.repository';

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
}
