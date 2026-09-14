import type {
  NotificationRecord,
  NotificationsRepository,
} from './notifications.repository';
import { NotificationsService } from './notifications.service';

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
  let service: NotificationsService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findMine: jest.fn(),
      countUnread: jest.fn(),
      markAllRead: jest.fn(),
    } as unknown as jest.Mocked<NotificationsRepository>;

    service = new NotificationsService(repository);
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
});
