import type { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import {
  NicknameRequiredException,
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import type { RequestRecord } from '../requests/requests.repository';
import type { RequestsService } from '../requests/requests.service';
import type { SettingsService } from '../settings/settings.service';
import type { SettingsRecord } from '../settings/settings.repository';
import type { UsersService } from '../users/users.service';
import type { User } from '../users/users.repository';
import type { ReplyRecord, RepliesRepository } from './replies.repository';
import { RepliesService } from './replies.service';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: 'author-1',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: true,
    ...overrides,
  };
}

function makeReply(overrides: Partial<ReplyRecord> = {}): ReplyRecord {
  return {
    id: 'reply-1',
    requestId: 'request-1',
    body: '괜찮아요.',
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

describe('RepliesService', () => {
  let repliesRepository: jest.Mocked<RepliesRepository>;
  let requestsService: jest.Mocked<RequestsService>;
  let answerInteractionsService: jest.Mocked<AnswerInteractionsService>;
  let settingsService: jest.Mocked<SettingsService>;
  let usersService: jest.Mocked<UsersService>;
  let repliesService: RepliesService;

  beforeEach(() => {
    repliesRepository = {
      create: jest.fn(),
      findVisibleById: jest.fn(),
      findVisibleByRequestId: jest.fn(),
      findByRequestAndAuthor: jest.fn(),
      countByGuest: jest.fn(),
      setHidden: jest.fn(),
      findMine: jest.fn(),
    } as unknown as jest.Mocked<RepliesRepository>;
    requestsService = {
      findVisibleById: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;
    answerInteractionsService = {
      clearForViewer: jest.fn(),
    } as unknown as jest.Mocked<AnswerInteractionsService>;
    settingsService = {
      get: jest.fn().mockResolvedValue(makeSettings()),
    } as unknown as jest.Mocked<SettingsService>;
    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    repliesService = new RepliesService(
      repliesRepository,
      requestsService,
      answerInteractionsService,
      settingsService,
      usersService,
    );
  });

  describe('create', () => {
    it('throws when the target request does not exist or is hidden', async () => {
      requestsService.findVisibleById.mockResolvedValue(undefined);

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용' },
          'user-1',
          'unused-guest-id',
        ),
      ).rejects.toBeInstanceOf(RequestNotFoundException);
    });

    it('throws when the logged-in user already replied to this request', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.findByRequestAndAuthor.mockResolvedValue(makeReply());

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용' },
          'user-1',
          'unused-guest-id',
        ),
      ).rejects.toBeInstanceOf(ReplyAlreadySubmittedException);
    });

    it('creates a reply for the logged-in user', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.findByRequestAndAuthor.mockResolvedValue(undefined);
      const created = makeReply({ authorId: 'user-1' });
      repliesRepository.create.mockResolvedValue(created);

      const result = await repliesService.create(
        'request-1',
        { body: '내용' },
        'user-1',
        'unused-guest-id',
      );

      expect(repliesRepository.create).toHaveBeenCalledWith({
        requestId: 'request-1',
        body: '내용',
        authorId: 'user-1',
        anonymous: true,
      });
      expect(result).toEqual(created);
      // Answering resolves any held/skipped state for this viewer+request.
      expect(answerInteractionsService.clearForViewer).toHaveBeenCalledWith(
        'request-1',
        'user-1',
        undefined,
      );
    });

    it('creates a named reply when the user opts out of anonymity and has a nickname', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.findByRequestAndAuthor.mockResolvedValue(undefined);
      usersService.findById.mockResolvedValue(makeUser({ nickname: '민들레' }));
      const created = makeReply({ authorId: 'user-1', anonymous: false });
      repliesRepository.create.mockResolvedValue(created);

      const result = await repliesService.create(
        'request-1',
        { body: '내용', anonymous: false },
        'user-1',
        'unused-guest-id',
      );

      expect(repliesRepository.create).toHaveBeenCalledWith({
        requestId: 'request-1',
        body: '내용',
        authorId: 'user-1',
        anonymous: false,
      });
      expect(result).toEqual(created);
    });

    it('throws when the user opts out of anonymity without a nickname set', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.findByRequestAndAuthor.mockResolvedValue(undefined);
      usersService.findById.mockResolvedValue(makeUser({ nickname: null }));

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용', anonymous: false },
          'user-1',
          'unused-guest-id',
        ),
      ).rejects.toBeInstanceOf(NicknameRequiredException);
      expect(repliesRepository.create).not.toHaveBeenCalled();
    });

    it('throws when the guest already replied 5 times total, across any requests', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.countByGuest.mockResolvedValue(5);

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용' },
          undefined,
          'guest-1',
        ),
      ).rejects.toBeInstanceOf(ReplyGuestLimitExceededException);
    });

    it('reads the guest reply limit from settings, not a hardcoded value', async () => {
      settingsService.get.mockResolvedValue(
        makeSettings({ guestReplyLimit: 2 }),
      );
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.countByGuest.mockResolvedValue(2);

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용' },
          undefined,
          'guest-1',
        ),
      ).rejects.toBeInstanceOf(ReplyGuestLimitExceededException);
    });

    it('creates a reply for a guest under the limit', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.countByGuest.mockResolvedValue(4);
      const created = makeReply({ guestId: 'guest-1' });
      repliesRepository.create.mockResolvedValue(created);

      const result = await repliesService.create(
        'request-1',
        { body: '내용' },
        undefined,
        'guest-1',
      );

      expect(repliesRepository.create).toHaveBeenCalledWith({
        requestId: 'request-1',
        body: '내용',
        guestId: 'guest-1',
      });
      expect(result).toEqual(created);
      expect(answerInteractionsService.clearForViewer).toHaveBeenCalledWith(
        'request-1',
        undefined,
        'guest-1',
      );
    });
  });

  describe('hide', () => {
    it('delegates to the repository', async () => {
      await repliesService.hide('reply-1');

      expect(repliesRepository.setHidden).toHaveBeenCalledWith('reply-1', true);
    });
  });

  describe('findMine', () => {
    it('resolves the viewer identity for a logged-in user', async () => {
      repliesRepository.findMine.mockResolvedValue([]);

      await repliesService.findMine('user-1', 'unused-guest-id');

      expect(repliesRepository.findMine).toHaveBeenCalledWith({
        authorId: 'user-1',
      });
    });

    it('resolves the viewer identity for a guest', async () => {
      repliesRepository.findMine.mockResolvedValue([]);

      await repliesService.findMine(undefined, 'guest-1');

      expect(repliesRepository.findMine).toHaveBeenCalledWith({
        guestId: 'guest-1',
      });
    });
  });
});
