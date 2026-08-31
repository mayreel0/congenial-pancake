import type { RepliesService } from '../replies/replies.service';
import type {
  ReplyRecord,
  ReplyWithRequest,
} from '../replies/replies.repository';
import type { FeedItem, RequestRecord } from '../requests/requests.repository';
import type { RequestsService } from '../requests/requests.service';
import type { User } from '../users/users.repository';
import type { UsersService } from '../users/users.service';
import { ProfileService } from './profile.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
    email: 'user@example.com',
    passwordHash: null,
    nickname: '민들레',
    nicknameChangedAt: null,
    showRequestsOnProfile: true,
    showRepliesOnProfile: true,
    showCountsOnProfile: true,
    nicknameVisible: true,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: 'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: false,
    ...overrides,
  };
}

function makeReply(overrides: Partial<ReplyRecord> = {}): ReplyRecord {
  return {
    id: 'reply-1',
    requestId: 'request-2',
    body: '괜찮아요.',
    authorId: 'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
    guestId: null,
    createdAt: new Date('2026-08-22T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: false,
    ...overrides,
  };
}

describe('ProfileService', () => {
  let usersService: jest.Mocked<UsersService>;
  let requestsService: jest.Mocked<RequestsService>;
  let repliesService: jest.Mocked<RepliesService>;
  let profileService: ProfileService;

  beforeEach(() => {
    usersService = {
      findByNicknameAndDiscriminator: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    requestsService = {
      findPublicByAuthor: jest.fn(),
      findFeedItemById: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;
    repliesService = {
      findPublicByAuthor: jest.fn(),
      findVisibleById: jest.fn(),
    } as unknown as jest.Mocked<RepliesService>;

    profileService = new ProfileService(
      usersService,
      requestsService,
      repliesService,
    );
  });

  describe('findProfile', () => {
    it('returns undefined when no user holds that nickname/discriminator', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(undefined);

      const result = await profileService.findProfile('민들레', 'C376');

      expect(result).toBeUndefined();
      expect(requestsService.findPublicByAuthor).not.toHaveBeenCalled();
      expect(repliesService.findPublicByAuthor).not.toHaveBeenCalled();
    });

    it('composes the nickname with a preview of revealed requests and replies', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      requestsService.findPublicByAuthor.mockResolvedValue({
        items: [makeRequest()],
        totalItems: 13,
      });
      const withRequest: ReplyWithRequest = {
        reply: makeReply(),
        request: makeRequest({
          id: 'request-2',
          body: '오늘도 무사히 지나갔어요.',
        }),
      };
      repliesService.findPublicByAuthor.mockResolvedValue({
        items: [withRequest],
        totalItems: 7,
      });

      const result = await profileService.findProfile('민들레', 'C376');

      expect(requestsService.findPublicByAuthor).toHaveBeenCalledWith(
        'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
        { page: 1, pageSize: 5 },
      );
      expect(repliesService.findPublicByAuthor).toHaveBeenCalledWith(
        'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
        { page: 1, pageSize: 5 },
      );
      expect(result).toEqual({
        nickname: '민들레',
        nicknameDiscriminator: 'C376',
        requestsVisible: true,
        repliesVisible: true,
        countsVisible: true,
        // Counts come from the paginated query's real totalItems, not the
        // (possibly-truncated) preview page's length.
        requestCount: 13,
        replyCount: 7,
        requests: [
          {
            id: 'request-1',
            body: '오늘 조금 힘들었어요.',
            createdAt: new Date('2026-08-21T00:00:00.000Z'),
          },
        ],
        replies: [
          {
            id: 'reply-1',
            body: '괜찮아요.',
            createdAt: new Date('2026-08-22T00:00:00.000Z'),
            requestId: 'request-2',
            requestBody: '오늘도 무사히 지나갔어요.',
          },
        ],
      });
    });

    it('hides requests/replies but still reports counts when only the lists are turned off', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(
        makeUser({ showRequestsOnProfile: false, showRepliesOnProfile: false }),
      );
      requestsService.findPublicByAuthor.mockResolvedValue({
        items: [makeRequest()],
        totalItems: 1,
      });
      repliesService.findPublicByAuthor.mockResolvedValue({
        items: [
          { reply: makeReply(), request: makeRequest({ id: 'request-2' }) },
        ],
        totalItems: 1,
      });

      const result = await profileService.findProfile('민들레', 'C376');

      expect(result).toMatchObject({
        requestsVisible: false,
        repliesVisible: false,
        countsVisible: true,
        requestCount: 1,
        replyCount: 1,
        requests: [],
        replies: [],
      });
    });

    it('hides counts but still lists content when only the count switch is off', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(
        makeUser({ showCountsOnProfile: false }),
      );
      requestsService.findPublicByAuthor.mockResolvedValue({
        items: [makeRequest()],
        totalItems: 1,
      });
      repliesService.findPublicByAuthor.mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      const result = await profileService.findProfile('민들레', 'C376');

      expect(result).toMatchObject({
        requestsVisible: true,
        repliesVisible: true,
        countsVisible: false,
        requestCount: null,
        replyCount: null,
      });
      expect(result?.requests).toHaveLength(1);
    });
  });

  describe('findRequestsPage', () => {
    it('returns the full paginated list when requests are visible', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      requestsService.findPublicByAuthor.mockResolvedValue({
        items: [makeRequest()],
        totalItems: 13,
      });

      const result = await profileService.findRequestsPage('민들레', 'C376', {
        page: 2,
        pageSize: 10,
      });

      expect(requestsService.findPublicByAuthor).toHaveBeenCalledWith(
        'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
        { page: 2, pageSize: 10 },
      );
      expect(result).toEqual({
        items: [
          {
            id: 'request-1',
            body: '오늘 조금 힘들었어요.',
            createdAt: new Date('2026-08-21T00:00:00.000Z'),
          },
        ],
        totalItems: 13,
      });
    });

    it('returns undefined when the owner turned the list off', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(
        makeUser({ showRequestsOnProfile: false }),
      );

      const result = await profileService.findRequestsPage('민들레', 'C376', {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeUndefined();
      expect(requestsService.findPublicByAuthor).not.toHaveBeenCalled();
    });

    it('returns undefined when no user holds that nickname/discriminator', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(undefined);

      const result = await profileService.findRequestsPage('민들레', 'C376', {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findRepliesPage', () => {
    it('returns the full paginated list when replies are visible', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      repliesService.findPublicByAuthor.mockResolvedValue({
        items: [
          {
            reply: makeReply(),
            request: makeRequest({ id: 'request-2', body: '무사히요.' }),
          },
        ],
        totalItems: 7,
      });

      const result = await profileService.findRepliesPage('민들레', 'C376', {
        page: 1,
        pageSize: 10,
      });

      expect(result).toEqual({
        items: [
          {
            id: 'reply-1',
            body: '괜찮아요.',
            createdAt: new Date('2026-08-22T00:00:00.000Z'),
            requestId: 'request-2',
            requestBody: '무사히요.',
          },
        ],
        totalItems: 7,
      });
    });

    it('returns undefined when the owner turned the list off', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(
        makeUser({ showRepliesOnProfile: false }),
      );

      const result = await profileService.findRepliesPage('민들레', 'C376', {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeUndefined();
      expect(repliesService.findPublicByAuthor).not.toHaveBeenCalled();
    });
  });

  describe('findRequestThread', () => {
    it('returns the thread when the request belongs to this profile owner and is revealed', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      const item: FeedItem = { request: makeRequest(), replies: [makeReply()] };
      requestsService.findFeedItemById.mockResolvedValue(item);

      const result = await profileService.findRequestThread(
        '민들레',
        'C376',
        'request-1',
      );

      expect(requestsService.findFeedItemById).toHaveBeenCalledWith(
        'request-1',
      );
      expect(result).toBe(item);
    });

    it('returns undefined when the request belongs to someone else', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      requestsService.findFeedItemById.mockResolvedValue({
        request: makeRequest({ authorId: 'someone-else' }),
        replies: [],
      });

      const result = await profileService.findRequestThread(
        '민들레',
        'C376',
        'request-1',
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the request was never revealed', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      requestsService.findFeedItemById.mockResolvedValue({
        request: makeRequest({ anonymous: true }),
        replies: [],
      });

      const result = await profileService.findRequestThread(
        '민들레',
        'C376',
        'request-1',
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the owner turned the requests list off', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(
        makeUser({ showRequestsOnProfile: false }),
      );

      const result = await profileService.findRequestThread(
        '민들레',
        'C376',
        'request-1',
      );

      expect(result).toBeUndefined();
      expect(requestsService.findFeedItemById).not.toHaveBeenCalled();
    });

    it('returns undefined when the request is hidden/deleted', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      requestsService.findFeedItemById.mockResolvedValue(undefined);

      const result = await profileService.findRequestThread(
        '민들레',
        'C376',
        'request-1',
      );

      expect(result).toBeUndefined();
    });
  });

  describe('findReplyThread', () => {
    it('resolves the reply to its parent thread when owned and revealed', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      const reply = makeReply();
      repliesService.findVisibleById.mockResolvedValue(reply);
      const item: FeedItem = {
        request: makeRequest({ id: 'request-2' }),
        replies: [reply],
      };
      requestsService.findFeedItemById.mockResolvedValue(item);

      const result = await profileService.findReplyThread(
        '민들레',
        'C376',
        'reply-1',
      );

      expect(repliesService.findVisibleById).toHaveBeenCalledWith('reply-1');
      expect(requestsService.findFeedItemById).toHaveBeenCalledWith(
        'request-2',
      );
      expect(result).toBe(item);
    });

    it('returns undefined when the reply belongs to someone else', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      repliesService.findVisibleById.mockResolvedValue(
        makeReply({ authorId: 'someone-else' }),
      );

      const result = await profileService.findReplyThread(
        '민들레',
        'C376',
        'reply-1',
      );

      expect(result).toBeUndefined();
      expect(requestsService.findFeedItemById).not.toHaveBeenCalled();
    });

    it('returns undefined when the reply was never revealed', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      repliesService.findVisibleById.mockResolvedValue(
        makeReply({ anonymous: true }),
      );

      const result = await profileService.findReplyThread(
        '민들레',
        'C376',
        'reply-1',
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the owner turned the replies list off', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(
        makeUser({ showRepliesOnProfile: false }),
      );

      const result = await profileService.findReplyThread(
        '민들레',
        'C376',
        'reply-1',
      );

      expect(result).toBeUndefined();
      expect(repliesService.findVisibleById).not.toHaveBeenCalled();
    });

    it('returns undefined when the reply itself is hidden/deleted', async () => {
      usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
      repliesService.findVisibleById.mockResolvedValue(undefined);

      const result = await profileService.findReplyThread(
        '민들레',
        'C376',
        'reply-1',
      );

      expect(result).toBeUndefined();
      expect(requestsService.findFeedItemById).not.toHaveBeenCalled();
    });
  });
});
