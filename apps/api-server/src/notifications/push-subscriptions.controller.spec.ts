import type {
  PushSubscriptionRecord,
  PushSubscriptionsRepository,
} from './push-subscriptions.repository';
import { PushSubscriptionsController } from './push-subscriptions.controller';

function makeSubscription(
  overrides: Partial<PushSubscriptionRecord> = {},
): PushSubscriptionRecord {
  return {
    id: 'sub-1',
    userId: 'user-1',
    endpoint: 'https://push.example.com/1',
    p256dh: 'p256dh-key',
    auth: 'auth-key',
    createdAt: new Date('2026-09-18T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PushSubscriptionsController', () => {
  let repository: jest.Mocked<PushSubscriptionsRepository>;
  let controller: PushSubscriptionsController;

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
    } as unknown as jest.Mocked<PushSubscriptionsRepository>;
    controller = new PushSubscriptionsController(repository);
  });

  describe('findMine', () => {
    it("returns only the caller's own endpoints, never the keys", async () => {
      repository.findByUserId.mockResolvedValue([
        makeSubscription({ endpoint: 'https://push.example.com/1' }),
        makeSubscription({
          id: 'sub-2',
          endpoint: 'https://push.example.com/2',
        }),
      ]);

      const result = await controller.findMine('user-1');

      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        endpoints: ['https://push.example.com/1', 'https://push.example.com/2'],
      });
    });
  });
});
