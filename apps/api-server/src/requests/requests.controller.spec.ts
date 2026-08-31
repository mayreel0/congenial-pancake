import type { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import { kstDayRange, yesterdayKstDateString } from '../common/kst-date';
import type { UsersService } from '../users/users.service';
import type { ReplyRecord, RequestRecord } from './requests.repository';
import type { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: 'request-1',
    body: '오늘 조금 힘들었어요.',
    authorId: 'user-1',
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
    requestId: 'request-1',
    body: '괜찮아요.',
    authorId: 'user-2',
    guestId: null,
    createdAt: new Date('2026-08-21T01:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    anonymous: false,
    ...overrides,
  };
}

describe('RequestsController', () => {
  let requestsService: jest.Mocked<RequestsService>;
  let answerInteractionsService: jest.Mocked<AnswerInteractionsService>;
  let usersService: jest.Mocked<UsersService>;
  let controller: RequestsController;

  beforeEach(() => {
    requestsService = {
      findMine: jest.fn(),
      findFeed: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;
    answerInteractionsService =
      {} as unknown as jest.Mocked<AnswerInteractionsService>;
    usersService = {
      nicknameMapFor: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    controller = new RequestsController(
      requestsService,
      answerInteractionsService,
      usersService,
    );
  });

  describe('feed', () => {
    beforeEach(() => {
      requestsService.findFeed.mockResolvedValue({ items: [], totalItems: 0 });
      usersService.nicknameMapFor.mockResolvedValue(new Map());
    });

    it('defaults to yesterday (KST) when no date is given', async () => {
      const result = await controller.feed(undefined, undefined, undefined);

      const expectedDate = yesterdayKstDateString();
      expect(requestsService.findFeed).toHaveBeenCalledWith(
        kstDayRange(expectedDate),
        { page: 1, pageSize: 10 },
      );
      expect(result.date).toBe(expectedDate);
    });

    it('uses the given date when it is a valid calendar date', async () => {
      await controller.feed('2026-08-20', undefined, undefined);

      expect(requestsService.findFeed).toHaveBeenCalledWith(
        kstDayRange('2026-08-20'),
        { page: 1, pageSize: 10 },
      );
    });

    it('falls back to yesterday when the date param is malformed', async () => {
      await controller.feed('not-a-date', undefined, undefined);

      expect(requestsService.findFeed).toHaveBeenCalledWith(
        kstDayRange(yesterdayKstDateString()),
        { page: 1, pageSize: 10 },
      );
    });

    it('parses the page param, defaulting invalid values to 1', async () => {
      await controller.feed('2026-08-20', '3', undefined);
      expect(requestsService.findFeed).toHaveBeenCalledWith(
        kstDayRange('2026-08-20'),
        { page: 3, pageSize: 10 },
      );

      await controller.feed('2026-08-20', 'nope', undefined);
      expect(requestsService.findFeed).toHaveBeenLastCalledWith(
        kstDayRange('2026-08-20'),
        { page: 1, pageSize: 10 },
      );
    });

    it('parses the pageSize param, whitelisting only 10/20/50', async () => {
      await controller.feed('2026-08-20', undefined, '20');
      expect(requestsService.findFeed).toHaveBeenCalledWith(
        kstDayRange('2026-08-20'),
        { page: 1, pageSize: 20 },
      );

      await controller.feed('2026-08-20', undefined, '999');
      expect(requestsService.findFeed).toHaveBeenLastCalledWith(
        kstDayRange('2026-08-20'),
        { page: 1, pageSize: 10 },
      );
    });
  });

  describe('mine', () => {
    it('returns the current user’s requests with nested replies and batched nickname lookup', async () => {
      requestsService.findMine.mockResolvedValue({
        items: [
          {
            request: makeRequest(),
            replies: [
              makeReply(),
              makeReply({ id: 'reply-2', authorId: null, guestId: 'guest-1' }),
            ],
          },
        ],
        totalItems: 1,
      });
      usersService.nicknameMapFor.mockResolvedValue(
        new Map([
          ['user-1', '민들레'],
          ['user-2', '햇살'],
        ]),
      );

      const result = await controller.mine(
        'user-1',
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(requestsService.findMine).toHaveBeenCalledWith(
        'user-1',
        { start: undefined, end: undefined },
        { page: 1, pageSize: 10 },
      );
      expect(usersService.nicknameMapFor).toHaveBeenCalledWith([
        'user-1',
        'user-2',
      ]);
      expect(result).toEqual({
        items: [
          {
            request: {
              id: 'request-1',
              body: '오늘 조금 힘들었어요.',
              createdAt: new Date('2026-08-21T00:00:00.000Z'),
              author: {
                anonymous: false,
                nickname: '민들레',
                nicknameDiscriminator: 'SER1',
              },
            },
            replies: [
              {
                id: 'reply-1',
                body: '괜찮아요.',
                createdAt: new Date('2026-08-21T01:00:00.000Z'),
                author: {
                  anonymous: false,
                  nickname: '햇살',
                  nicknameDiscriminator: 'SER2',
                },
              },
              {
                id: 'reply-2',
                body: '괜찮아요.',
                createdAt: new Date('2026-08-21T01:00:00.000Z'),
                author: { anonymous: true },
              },
            ],
          },
        ],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      });
    });
  });
});
