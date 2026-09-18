jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

import type { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { Env } from '../config/env.schema';
import type {
  PushSubscriptionRecord,
  PushSubscriptionsRepository,
} from './push-subscriptions.repository';
import { WebPushService } from './web-push.service';

function makeConfig(
  overrides: Partial<Record<keyof Env, string>> = {},
): jest.Mocked<ConfigService<Env, true>> {
  const values: Record<string, string> = {
    VAPID_PUBLIC_KEY: 'public-key',
    VAPID_PRIVATE_KEY: 'private-key',
    VAPID_SUBJECT: 'mailto:hello@onseol.com',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as jest.Mocked<ConfigService<Env, true>>;
}

function makeSubscription(
  overrides: Partial<PushSubscriptionRecord> = {},
): PushSubscriptionRecord {
  return {
    id: 'sub-1',
    userId: 'author-1',
    endpoint: 'https://push.example.com/sub-1',
    p256dh: 'p256dh-key',
    auth: 'auth-key',
    createdAt: new Date('2026-09-18T00:00:00.000Z'),
    ...overrides,
  };
}

describe('WebPushService', () => {
  let repository: jest.Mocked<PushSubscriptionsRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      findByUserId: jest.fn(),
      deleteByEndpoints: jest.fn(),
      deleteByEndpointForUser: jest.fn(),
      upsert: jest.fn(),
    } as unknown as jest.Mocked<PushSubscriptionsRepository>;
  });

  it('does nothing when VAPID keys are not configured', async () => {
    const service = new WebPushService(
      makeConfig({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' }),
      repository,
    );

    await service.sendToUser('author-1', {
      title: '온설',
      body: '답장이 도착했어요',
      url: 'https://onseol.com/records',
    });

    expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    expect(repository.findByUserId).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('sends to every subscription the user has', async () => {
    repository.findByUserId.mockResolvedValue([
      makeSubscription({ id: 'sub-1', endpoint: 'https://push.example.com/1' }),
      makeSubscription({ id: 'sub-2', endpoint: 'https://push.example.com/2' }),
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);
    const service = new WebPushService(makeConfig(), repository);

    const payload = {
      title: '온설',
      body: '답장이 도착했어요',
      url: 'https://onseol.com/records',
    };
    await service.sendToUser('author-1', payload);

    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:hello@onseol.com',
      'public-key',
      'private-key',
    );
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example.com/1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      },
      JSON.stringify(payload),
    );
  });

  it('batches every expired (404/410) subscription into one deleteByEndpoints call', async () => {
    repository.findByUserId.mockResolvedValue([
      makeSubscription({ id: 'sub-1', endpoint: 'https://push.example.com/1' }),
      makeSubscription({ id: 'sub-2', endpoint: 'https://push.example.com/2' }),
    ]);
    (webpush.sendNotification as jest.Mock)
      .mockRejectedValueOnce(
        Object.assign(new Error('Gone'), { statusCode: 410 }),
      )
      .mockRejectedValueOnce(
        Object.assign(new Error('Not Found'), { statusCode: 404 }),
      );
    const service = new WebPushService(makeConfig(), repository);

    await service.sendToUser('author-1', {
      title: '온설',
      body: '답장이 도착했어요',
      url: 'https://onseol.com/records',
    });

    expect(repository.deleteByEndpoints).toHaveBeenCalledTimes(1);
    expect(repository.deleteByEndpoints).toHaveBeenCalledWith(
      expect.arrayContaining([
        'https://push.example.com/1',
        'https://push.example.com/2',
      ]),
    );
  });

  it('keeps the subscription and does not throw on a non-410/404 send failure', async () => {
    repository.findByUserId.mockResolvedValue([makeSubscription()]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Service unavailable'), { statusCode: 503 }),
    );
    const service = new WebPushService(makeConfig(), repository);

    await expect(
      service.sendToUser('author-1', {
        title: '온설',
        body: '답장이 도착했어요',
        url: 'https://onseol.com/records',
      }),
    ).resolves.toBeUndefined();
    expect(repository.deleteByEndpoints).not.toHaveBeenCalled();
  });

  it('never rejects, even when the initial subscription lookup itself fails', async () => {
    repository.findByUserId.mockRejectedValue(new Error('connection reset'));
    const service = new WebPushService(makeConfig(), repository);

    await expect(
      service.sendToUser('author-1', {
        title: '온설',
        body: '답장이 도착했어요',
        url: 'https://onseol.com/records',
      }),
    ).resolves.toBeUndefined();
  });
});
