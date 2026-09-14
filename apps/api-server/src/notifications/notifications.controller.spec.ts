import { firstValueFrom, of, toArray } from 'rxjs';
import { NotificationsController } from './notifications.controller';
import type { NotificationRecord } from './notifications.repository';
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

  describe('stream', () => {
    it("scopes the stream to the caller's own userId", () => {
      notificationsService.stream.mockReturnValue(of());

      controller.stream('author-1');

      expect(notificationsService.stream).toHaveBeenCalledWith('author-1');
    });

    it('maps each notification to an SSE MessageEvent carrying the response DTO', async () => {
      const notification = makeNotification();
      notificationsService.stream.mockReturnValue(of(notification));

      const events = await firstValueFrom(
        controller.stream('author-1').pipe(toArray()),
      );

      expect(events).toEqual([
        {
          data: {
            id: 'notification-1',
            type: 'reply_received',
            requestId: 'request-1',
            replyId: 'reply-1',
            createdAt: '2026-09-15T00:00:00.000Z',
            readAt: null,
          },
        },
      ]);
    });
  });
});
