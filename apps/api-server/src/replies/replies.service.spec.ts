import type { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import {
  NicknameRequiredException,
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  ReplyNotFoundException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import type { ReplyContentModerationService } from '../moderation/reply-content/reply-content-moderation.service';
import type { ReplyModerationLogService } from '../moderation/reply-content/reply-moderation-log.service';
import type { ModerationResult } from '../moderation/reply-content/reply-content-moderation.types';
import type { NotificationsService } from '../notifications/notifications.service';
import type { RequestRecord } from '../requests/requests.repository';
import type { RequestsService } from '../requests/requests.service';
import type { SettingsService } from '../settings/settings.service';
import type { SettingsRecord } from '../settings/settings.repository';
import type { User } from '../users/users.repository';
import type { UsersService } from '../users/users.service';
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
    contentRemoved: false,
    contentRemovedAt: null,
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

// Verified by default — most tests here aren't about the unverified reply
// cap, so they shouldn't need to think about it.
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: null,
    nickname: null,
    emailVerifiedAt: new Date('2026-08-21T00:00:00.000Z'),
    nicknameChangedAt: null,
    showRequestsOnProfile: true,
    showRepliesOnProfile: true,
    showCountsOnProfile: true,
    nicknameVisible: true,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    deletionRequestedAt: null,
    deletedAt: null,
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
  let replyContentModerationService: jest.Mocked<ReplyContentModerationService>;
  let replyModerationLogService: jest.Mocked<ReplyModerationLogService>;
  let notificationsService: jest.Mocked<NotificationsService>;
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
      findById: jest.fn(),
      softDelete: jest.fn(),
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
      findById: jest.fn().mockResolvedValue(makeUser()),
    } as unknown as jest.Mocked<UsersService>;
    replyContentModerationService = {
      moderate: jest.fn().mockResolvedValue({
        action: 'allow',
        reason: '',
        categories: [],
        severity: 0,
        confidence: 1,
        suggestions: [],
        telemetry: { shouldPersistForTraining: true },
      } satisfies ModerationResult),
    } as unknown as jest.Mocked<ReplyContentModerationService>;
    replyModerationLogService = {
      recordDryRunResult: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ReplyModerationLogService>;
    notificationsService = {
      createReplyReceived: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationsService>;

    repliesService = new RepliesService(
      repliesRepository,
      requestsService,
      answerInteractionsService,
      settingsService,
      usersService,
      replyContentModerationService,
      replyModerationLogService,
      notificationsService,
    );
  });

  // moderateInBackground is fire-and-forget (never awaited by create()) —
  // flush the microtask queue so its .then()/.catch() chain settles before
  // asserting on the mocks it calls.
  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

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

    it('throws when the target request was self-deleted by its author', async () => {
      requestsService.findVisibleById.mockResolvedValue(
        makeRequest({ contentRemoved: true }),
      );

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

    it('fires a background moderation dry-run and logs the result, without affecting the response', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.findByRequestAndAuthor.mockResolvedValue(undefined);
      const created = makeReply({ authorId: 'user-1', body: '괜찮아요.' });
      repliesRepository.create.mockResolvedValue(created);

      const result = await repliesService.create(
        'request-1',
        { body: '괜찮아요.' },
        'user-1',
        'unused-guest-id',
      );
      await flushMicrotasks();

      expect(result).toEqual(created); // create() never waits on moderation
      expect(replyContentModerationService.moderate).toHaveBeenCalledWith({
        text: '괜찮아요.',
        surface: 'reply',
        metadata: { source: 'user' },
      });
      expect(replyModerationLogService.recordDryRunResult).toHaveBeenCalledWith(
        created.id,
        await replyContentModerationService.moderate.mock.results[0].value,
      );
    });

    it('tags load-test traffic so it can be excluded from moderation training data', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.countByGuest.mockResolvedValue(0);
      repliesRepository.create.mockResolvedValue(
        makeReply({ guestId: 'guest-1', body: '내용' }),
      );

      await repliesService.create(
        'request-1',
        { body: '내용' },
        undefined,
        'guest-1',
        true,
      );
      await flushMicrotasks();

      expect(replyContentModerationService.moderate).toHaveBeenCalledWith({
        text: '내용',
        surface: 'reply',
        metadata: { isLoadTest: true, source: 'load_test' },
      });
    });

    it('logs (not throws) when the moderation dry-run call fails', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.countByGuest.mockResolvedValue(0);
      repliesRepository.create.mockResolvedValue(
        makeReply({ guestId: 'guest-1' }),
      );
      replyContentModerationService.moderate.mockRejectedValue(
        new Error('boom'),
      );

      const result = await repliesService.create(
        'request-1',
        { body: '내용' },
        undefined,
        'guest-1',
      );
      await flushMicrotasks();

      expect(result).toBeDefined(); // the reply itself still succeeded
      expect(
        replyModerationLogService.recordDryRunResult,
      ).not.toHaveBeenCalled();
    });

    it('notifies the request author (member) when someone else replies', async () => {
      requestsService.findVisibleById.mockResolvedValue(
        makeRequest({ authorId: 'author-1' }),
      );
      repliesRepository.countByGuest.mockResolvedValue(0);
      const created = makeReply({ id: 'reply-1', guestId: 'guest-1' });
      repliesRepository.create.mockResolvedValue(created);

      await repliesService.create(
        'request-1',
        { body: '내용' },
        undefined,
        'guest-1',
      );
      await flushMicrotasks();

      expect(notificationsService.createReplyReceived).toHaveBeenCalledWith(
        'author-1',
        'request-1',
        'reply-1',
      );
    });

    it('does not notify when the request author replies to their own request', async () => {
      requestsService.findVisibleById.mockResolvedValue(
        makeRequest({ authorId: 'user-1' }),
      );
      repliesRepository.findByRequestAndAuthor.mockResolvedValue(undefined);
      repliesRepository.create.mockResolvedValue(
        makeReply({ authorId: 'user-1' }),
      );

      await repliesService.create(
        'request-1',
        { body: '내용' },
        'user-1',
        'unused-guest-id',
      );
      await flushMicrotasks();

      expect(notificationsService.createReplyReceived).not.toHaveBeenCalled();
    });

    it('does not notify when the request author is a guest', async () => {
      requestsService.findVisibleById.mockResolvedValue(
        makeRequest({ authorId: null, guestId: 'requester-guest' }),
      );
      repliesRepository.countByGuest.mockResolvedValue(0);
      repliesRepository.create.mockResolvedValue(makeReply());

      await repliesService.create(
        'request-1',
        { body: '내용' },
        undefined,
        'guest-1',
      );
      await flushMicrotasks();

      expect(notificationsService.createReplyReceived).not.toHaveBeenCalled();
    });

    it('logs (not throws) when notifying the request author fails', async () => {
      requestsService.findVisibleById.mockResolvedValue(
        makeRequest({ authorId: 'author-1' }),
      );
      repliesRepository.countByGuest.mockResolvedValue(0);
      repliesRepository.create.mockResolvedValue(
        makeReply({ guestId: 'guest-1' }),
      );
      notificationsService.createReplyReceived.mockRejectedValue(
        new Error('boom'),
      );

      const result = await repliesService.create(
        'request-1',
        { body: '내용' },
        undefined,
        'guest-1',
      );
      await flushMicrotasks();

      expect(result).toBeDefined(); // the reply itself still succeeded
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
      repliesRepository.findMine.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      await repliesService.findMine(
        'user-1',
        'unused-guest-id',
        {},
        { page: 1, pageSize: 20 },
        '힘들',
      );

      expect(repliesRepository.findMine).toHaveBeenCalledWith(
        { authorId: 'user-1' },
        {},
        { page: 1, pageSize: 20 },
        '힘들',
      );
    });

    it('resolves the viewer identity for a guest', async () => {
      repliesRepository.findMine.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      await repliesService.findMine(
        undefined,
        'guest-1',
        {},
        { page: 1, pageSize: 20 },
      );

      expect(repliesRepository.findMine).toHaveBeenCalledWith(
        { guestId: 'guest-1' },
        {},
        { page: 1, pageSize: 20 },
        undefined,
      );
    });
  });

  describe('deleteOwn', () => {
    it('soft-deletes the reply when the caller is the author and requestId matches', async () => {
      repliesRepository.findById.mockResolvedValue(
        makeReply({
          id: 'reply-1',
          requestId: 'request-1',
          authorId: 'user-1',
        }),
      );

      await repliesService.deleteOwn('user-1', 'request-1', 'reply-1');

      expect(repliesRepository.softDelete).toHaveBeenCalledWith('reply-1');
    });

    it('throws NotFound without deleting when the caller is not the author', async () => {
      repliesRepository.findById.mockResolvedValue(
        makeReply({
          id: 'reply-1',
          requestId: 'request-1',
          authorId: 'user-1',
        }),
      );

      await expect(
        repliesService.deleteOwn('someone-else', 'request-1', 'reply-1'),
      ).rejects.toBeInstanceOf(ReplyNotFoundException);
      expect(repliesRepository.softDelete).not.toHaveBeenCalled();
    });

    // Route is /requests/:requestId/replies/:id/delete-own — requestId
    // doesn't actually determine ownership (id alone identifies the reply
    // uniquely), but a mismatched requestId means the caller's request
    // doesn't describe the reply it thinks it does, so this should 404
    // rather than silently delete based on id alone.
    it('throws NotFound without deleting when requestId does not match the reply', async () => {
      repliesRepository.findById.mockResolvedValue(
        makeReply({
          id: 'reply-1',
          requestId: 'request-1',
          authorId: 'user-1',
        }),
      );

      await expect(
        repliesService.deleteOwn('user-1', 'some-other-request', 'reply-1'),
      ).rejects.toBeInstanceOf(ReplyNotFoundException);
      expect(repliesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('throws NotFound when the reply does not exist', async () => {
      repliesRepository.findById.mockResolvedValue(undefined);

      await expect(
        repliesService.deleteOwn('user-1', 'request-1', 'missing'),
      ).rejects.toBeInstanceOf(ReplyNotFoundException);
      expect(repliesRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
