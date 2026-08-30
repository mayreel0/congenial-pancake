import type { RepliesService } from '../replies/replies.service';
import type {
  ReplyRecord,
  ReplyWithRequest,
} from '../replies/replies.repository';
import type { RequestRecord } from '../requests/requests.repository';
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
    } as unknown as jest.Mocked<RequestsService>;
    repliesService = {
      findPublicByAuthor: jest.fn(),
    } as unknown as jest.Mocked<RepliesService>;

    profileService = new ProfileService(
      usersService,
      requestsService,
      repliesService,
    );
  });

  it('returns undefined when no user holds that nickname/discriminator', async () => {
    usersService.findByNicknameAndDiscriminator.mockResolvedValue(undefined);

    const result = await profileService.findProfile('민들레', 'C376');

    expect(result).toBeUndefined();
    expect(requestsService.findPublicByAuthor).not.toHaveBeenCalled();
    expect(repliesService.findPublicByAuthor).not.toHaveBeenCalled();
  });

  it('composes the nickname with revealed requests and replies', async () => {
    usersService.findByNicknameAndDiscriminator.mockResolvedValue(makeUser());
    requestsService.findPublicByAuthor.mockResolvedValue([makeRequest()]);
    const withRequest: ReplyWithRequest = {
      reply: makeReply(),
      request: makeRequest({
        id: 'request-2',
        body: '오늘도 무사히 지나갔어요.',
      }),
    };
    repliesService.findPublicByAuthor.mockResolvedValue([withRequest]);

    const result = await profileService.findProfile('민들레', 'C376');

    expect(requestsService.findPublicByAuthor).toHaveBeenCalledWith(
      'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
    );
    expect(repliesService.findPublicByAuthor).toHaveBeenCalledWith(
      'f8b3cf41-d4ee-4bce-9d5d-425fb33ac376',
    );
    expect(result).toEqual({
      nickname: '민들레',
      nicknameDiscriminator: 'C376',
      requestsVisible: true,
      repliesVisible: true,
      countsVisible: true,
      requestCount: 1,
      replyCount: 1,
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
    requestsService.findPublicByAuthor.mockResolvedValue([makeRequest()]);
    repliesService.findPublicByAuthor.mockResolvedValue([
      { reply: makeReply(), request: makeRequest({ id: 'request-2' }) },
    ]);

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
    requestsService.findPublicByAuthor.mockResolvedValue([makeRequest()]);
    repliesService.findPublicByAuthor.mockResolvedValue([]);

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
