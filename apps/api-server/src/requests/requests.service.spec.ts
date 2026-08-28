import {
  NicknameRequiredException,
  RequestGuestLimitExceededException,
} from '../common/exceptions/app.exception';
import type { SettingsService } from '../settings/settings.service';
import type { SettingsRecord } from '../settings/settings.repository';
import type { UsersService } from '../users/users.service';
import type { User } from '../users/users.repository';
import type { RequestRecord } from './requests.repository';
import type { RequestsRepository } from './requests.repository';
import { RequestsService } from './requests.service';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: null,
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: true,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: null,
    nickname: null,
    nicknameChangedAt: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

function makeSettings(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
  return {
    id: 1,
    queueFreshnessHours: 60,
    queueReplyCap: 5,
    guestReplyLimit: 5,
    nicknameCooldownDays: 7,
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('RequestsService', () => {
  let requestsRepository: jest.Mocked<RequestsRepository>;
  let settingsService: jest.Mocked<SettingsService>;
  let usersService: jest.Mocked<UsersService>;
  let requestsService: RequestsService;

  beforeEach(() => {
    requestsRepository = {
      create: jest.fn(),
      findVisibleById: jest.fn(),
      findVisible: jest.fn(),
      findByGuestId: jest.fn(),
      setHidden: jest.fn(),
      findQueueCandidate: jest.fn(),
    } as unknown as jest.Mocked<RequestsRepository>;
    settingsService = {
      get: jest.fn().mockResolvedValue(makeSettings()),
    } as unknown as jest.Mocked<SettingsService>;
    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    requestsService = new RequestsService(
      requestsRepository,
      settingsService,
      usersService,
    );
  });

  describe('create', () => {
    it('creates a request under the logged-in user without checking guestId', async () => {
      const created = makeRequest({ authorId: 'user-1' });
      requestsRepository.create.mockResolvedValue(created);

      const result = await requestsService.create(
        { body: '오늘 조금 힘들었어요.' },
        'user-1',
        'unused-guest-id',
      );

      expect(requestsRepository.findByGuestId).not.toHaveBeenCalled();
      expect(requestsRepository.create).toHaveBeenCalledWith({
        body: '오늘 조금 힘들었어요.',
        authorId: 'user-1',
        anonymous: true,
      });
      expect(result).toEqual(created);
    });

    it('creates a named request when the user opts out of anonymity and has a nickname', async () => {
      usersService.findById.mockResolvedValue(makeUser({ nickname: '민들레' }));
      const created = makeRequest({ authorId: 'user-1', anonymous: false });
      requestsRepository.create.mockResolvedValue(created);

      const result = await requestsService.create(
        { body: '내용', anonymous: false },
        'user-1',
        'unused-guest-id',
      );

      expect(requestsRepository.create).toHaveBeenCalledWith({
        body: '내용',
        authorId: 'user-1',
        anonymous: false,
      });
      expect(result).toEqual(created);
    });

    it('throws when the user opts out of anonymity without a nickname set', async () => {
      usersService.findById.mockResolvedValue(makeUser({ nickname: null }));

      await expect(
        requestsService.create(
          { body: '내용', anonymous: false },
          'user-1',
          'unused-guest-id',
        ),
      ).rejects.toBeInstanceOf(NicknameRequiredException);
      expect(requestsRepository.create).not.toHaveBeenCalled();
    });

    it('throws when the guest already posted a request', async () => {
      requestsRepository.findByGuestId.mockResolvedValue(
        makeRequest({ guestId: 'guest-1' }),
      );

      await expect(
        requestsService.create({ body: '내용' }, undefined, 'guest-1'),
      ).rejects.toBeInstanceOf(RequestGuestLimitExceededException);
    });

    it('creates a request for a first-time guest', async () => {
      requestsRepository.findByGuestId.mockResolvedValue(undefined);
      const created = makeRequest({ guestId: 'guest-1' });
      requestsRepository.create.mockResolvedValue(created);

      const result = await requestsService.create(
        { body: '내용' },
        undefined,
        'guest-1',
      );

      expect(requestsRepository.create).toHaveBeenCalledWith({
        body: '내용',
        guestId: 'guest-1',
      });
      expect(result).toEqual(created);
    });
  });

  describe('findQueueCandidate', () => {
    it('resolves the viewer identity for a logged-in user', async () => {
      const candidate = makeRequest({ id: 'request-2' });
      requestsRepository.findQueueCandidate.mockResolvedValue({
        ...candidate,
        replyCount: 0,
      });

      const result = await requestsService.findQueueCandidate(
        'user-1',
        'unused-guest-id',
      );

      expect(requestsRepository.findQueueCandidate).toHaveBeenCalledWith(
        { authorId: 'user-1' },
        { freshnessHours: 60, replyCap: 5 },
      );
      expect(result?.id).toBe('request-2');
    });

    it('resolves the viewer identity for a guest', async () => {
      requestsRepository.findQueueCandidate.mockResolvedValue(undefined);

      await requestsService.findQueueCandidate(undefined, 'guest-1');

      expect(requestsRepository.findQueueCandidate).toHaveBeenCalledWith(
        { guestId: 'guest-1' },
        { freshnessHours: 60, replyCap: 5 },
      );
    });

    it('reads freshness/cap from settings, not hardcoded values', async () => {
      settingsService.get.mockResolvedValue(
        makeSettings({ queueFreshnessHours: 24, queueReplyCap: 3 }),
      );
      requestsRepository.findQueueCandidate.mockResolvedValue(undefined);

      await requestsService.findQueueCandidate(undefined, 'guest-1');

      expect(requestsRepository.findQueueCandidate).toHaveBeenCalledWith(
        { guestId: 'guest-1' },
        { freshnessHours: 24, replyCap: 3 },
      );
    });
  });

  describe('hide', () => {
    it('delegates to the repository', async () => {
      await requestsService.hide('request-1');

      expect(requestsRepository.setHidden).toHaveBeenCalledWith(
        'request-1',
        true,
      );
    });
  });
});
