import { Injectable } from '@nestjs/common';
import type { PagedResult, Pagination } from '../requests/requests.repository';
import {
  NotificationsRepository,
  type NotificationRecord,
} from './notifications.repository';

const REPLY_RECEIVED = 'reply_received';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  createReplyReceived(
    requestAuthorId: string,
    requestId: string,
    replyId: string,
  ): Promise<NotificationRecord> {
    return this.notificationsRepository.create({
      userId: requestAuthorId,
      type: REPLY_RECEIVED,
      requestId,
      replyId,
    });
  }

  findMine(
    userId: string,
    pagination: Pagination,
  ): Promise<PagedResult<NotificationRecord>> {
    return this.notificationsRepository.findMine(userId, pagination);
  }

  unreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  markAllRead(userId: string): Promise<void> {
    return this.notificationsRepository.markAllRead(userId);
  }
}
