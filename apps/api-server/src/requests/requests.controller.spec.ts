import type { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
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

  describe('mine', () => {
    it('returns the current user’s requests with nested replies and batched nickname lookup', async () => {
      requestsService.findMine.mockResolvedValue([
        {
          request: makeRequest(),
          replies: [
            makeReply(),
            makeReply({ id: 'reply-2', authorId: null, guestId: 'guest-1' }),
          ],
        },
      ]);
      usersService.nicknameMapFor.mockResolvedValue(
        new Map([
          ['user-1', '민들레'],
          ['user-2', '햇살'],
        ]),
      );

      const result = await controller.mine('user-1');

      expect(requestsService.findMine).toHaveBeenCalledWith('user-1');
      expect(usersService.nicknameMapFor).toHaveBeenCalledWith([
        'user-1',
        'user-2',
      ]);
      expect(result).toEqual([
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
      ]);
    });
  });
});
