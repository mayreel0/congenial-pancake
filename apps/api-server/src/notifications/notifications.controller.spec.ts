import { firstValueFrom, of, toArray } from 'rxjs';
import { NotificationsController } from './notifications.controller';
import type {
  NotificationRecord,
  NotificationWithRequest,
} from './notifications.repository';
import type { NotificationsService } from './notifications.service';

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

function makeNotificationWithRequest(
  overrides: Partial<NotificationWithRequest> = {},
): NotificationWithRequest {
  return {
    ...makeNotification(),
    requestBody: '오늘 조금 힘들었어요.',
    requestContentRemoved: false,
    ...overrides,
  };
}

describe('NotificationsController', () => {
  let notificationsService: jest.Mocked<NotificationsService>;
  let controller: NotificationsController;

  beforeEach(() => {
    notificationsService = {
      findMine: jest.fn(),
      unreadCount: jest.fn(),
      markAllRead: jest.fn(),
      stream: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    controller = new NotificationsController(notificationsService);
  });

  describe('findMine', () => {
    it('maps the joined request body through visibleRequestBody', async () => {
      notificationsService.findMine.mockResolvedValue({
        items: [
          makeNotificationWithRequest({
            requestBody: '오늘 조금 힘들었어요.',
            requestContentRemoved: false,
          }),
          makeNotificationWithRequest({
            id: 'notification-2',
            requestBody: '삭제 전 원문',
            requestContentRemoved: true,
          }),
        ],
        totalItems: 2,
      });

      const result = await controller.findMine(
        'author-1',
        undefined,
        undefined,
      );

      expect(result.items[0].requestBody).toBe('오늘 조금 힘들었어요.');
      expect(result.items[1].requestBody).toBe('삭제된 글이에요.');
    });
  });

  describe('stream', () => {
    it("scopes the stream to the caller's own userId", () => {
      notificationsService.stream.mockReturnValue(of());

      controller.stream('author-1');

      expect(notificationsService.stream).toHaveBeenCalledWith('author-1');
    });

    it('maps each notification to a minimal "something changed" SSE ping', async () => {
      const notification = makeNotification({ id: 'notification-1' });
      notificationsService.stream.mockReturnValue(of(notification));

      const events = await firstValueFrom(
        controller.stream('author-1').pipe(toArray()),
      );

      expect(events).toEqual([{ data: { id: 'notification-1' } }]);
    });
  });
});
