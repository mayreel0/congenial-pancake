import type { ConfigService } from '@nestjs/config';
import { NotificationNotFoundException } from '../common/exceptions/app.exception';
import type { Env } from '../config/env.schema';
import type {
  NotificationRecord,
  NotificationsRepository,
} from './notifications.repository';
import { NotificationsService } from './notifications.service';
import type { WebPushService } from './web-push.service';

function makeNotification(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: 'notification-1',
    userId: 'author-1',
    type: 'reply_received',
    requestId: 'request-1',
    replyId: 'reply-1',
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    readAt: null,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let repository: jest.Mocked<NotificationsRepository>;
  let webPushService: jest.Mocked<WebPushService>;
  let config: jest.Mocked<ConfigService<Env, true>>;
  let service: NotificationsService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMine: jest.fn(),
      countUnread: jest.fn(),
      markAllRead: jest.fn(),
      deleteOne: jest.fn(),
      deleteAll: jest.fn(),
    } as unknown as jest.Mocked<NotificationsRepository>;
    webPushService = {
      sendToUser: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<WebPushService>;
    config = {
      get: jest.fn().mockReturnValue('https://onseol.com'),
    } as unknown as jest.Mocked<ConfigService<Env, true>>;

    service = new NotificationsService(repository, webPushService, config);
  });

  describe('createReplyReceived', () => {
    it('delegates to the repository with the reply_received type', async () => {
      const created = makeNotification();
      repository.create.mockResolvedValue(created);

      const result = await service.createReplyReceived(
        'author-1',
        'request-1',
        'reply-1',
      );

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'author-1',
        type: 'reply_received',
        requestId: 'request-1',
        replyId: 'reply-1',
      });
      expect(result).toEqual(created);
    });

    it("emits the new notification to that user's open stream", async () => {
      const created = makeNotification({ userId: 'author-1' });
      repository.create.mockResolvedValue(created);
      const received: unknown[] = [];
      service.stream('author-1').subscribe((notification) => {
        received.push(notification);
      });

      await service.createReplyReceived('author-1', 'request-1', 'reply-1');

      expect(received).toEqual([created]);
    });

    it("does not emit to a different user's stream", async () => {
      const created = makeNotification({ userId: 'author-1' });
      repository.create.mockResolvedValue(created);
      const received: unknown[] = [];
      service.stream('someone-else').subscribe((notification) => {
        received.push(notification);
      });

      await service.createReplyReceived('author-1', 'request-1', 'reply-1');

      expect(received).toEqual([]);
    });

    it('sends a web push with a generic body (no reply content) and a deep link to the thread', async () => {
      repository.create.mockResolvedValue(makeNotification());

      await service.createReplyReceived('author-1', 'request-1', 'reply-1');

      expect(webPushService.sendToUser).toHaveBeenCalledWith('author-1', {
        title: '온설',
        body: '답장이 도착했어요',
        url: 'https://onseol.com/records/requests/request-1?replyId=reply-1',
      });
    });
  });

  describe('findMine', () => {
    it('delegates to the repository', async () => {
      repository.findMine.mockResolvedValue({ items: [], totalItems: 0 });

      await service.findMine('author-1', { page: 1, pageSize: 20 });

      expect(repository.findMine).toHaveBeenCalledWith('author-1', {
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('unreadCount', () => {
    it('delegates to the repository', async () => {
      repository.countUnread.mockResolvedValue(3);

      const count = await service.unreadCount('author-1');

      expect(repository.countUnread).toHaveBeenCalledWith('author-1');
      expect(count).toBe(3);
    });
  });

  describe('markAllRead', () => {
    it('delegates to the repository', async () => {
      await service.markAllRead('author-1');

      expect(repository.markAllRead).toHaveBeenCalledWith('author-1');
    });
  });

  describe('deleteOne', () => {
    it('delegates to the repository', async () => {
      repository.deleteOne.mockResolvedValue(true);

      await service.deleteOne('author-1', 'notification-1');

      expect(repository.deleteOne).toHaveBeenCalledWith(
        'author-1',
        'notification-1',
      );
    });

    it('throws NotificationNotFoundException when the repository deleted nothing', async () => {
      repository.deleteOne.mockResolvedValue(false);

      await expect(service.deleteOne('author-1', 'not-mine')).rejects.toThrow(
        NotificationNotFoundException,
      );
    });
  });

  describe('deleteAll', () => {
    it('delegates to the repository', async () => {
      await service.deleteAll('author-1');

      expect(repository.deleteAll).toHaveBeenCalledWith('author-1');
    });
  });

  describe('sendTestPush', () => {
    it('sends a generic test push and reports the subscription count', async () => {
      webPushService.sendToUser.mockResolvedValue(2);

      const result = await service.sendTestPush('author-1', false);

      expect(webPushService.sendToUser).toHaveBeenCalledWith('author-1', {
        title: '온설',
        body: '관리자가 보낸 테스트 알림이에요.',
        url: 'https://onseol.com',
      });
      expect(result).toEqual({ subscriptionCount: 2 });
    });

    it('does not persist a notification row when persist is false', async () => {
      await service.sendTestPush('author-1', false);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("persists a 'test'-type notification with no linked request/reply when persist is true", async () => {
      const created = makeNotification({
        type: 'test',
        requestId: null,
        replyId: null,
      });
      repository.create.mockResolvedValue(created);
      const received: unknown[] = [];
      service.stream('author-1').subscribe((notification) => {
        received.push(notification);
      });

      await service.sendTestPush('author-1', true);

      expect(webPushService.sendToUser).toHaveBeenCalledWith('author-1', {
        title: '온설',
        body: '관리자가 보낸 테스트 알림이에요.',
        url: 'https://onseol.com/notifications',
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'author-1',
        type: 'test',
        requestId: null,
        replyId: null,
      });
      expect(received).toEqual([created]);
    });
  });
});
