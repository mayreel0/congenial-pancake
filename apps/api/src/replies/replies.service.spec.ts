import {
  GuestIdRequiredException,
  ReplyAlreadySubmittedException,
  ReplyGuestLimitExceededException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import type { RequestRecord } from '../requests/requests.repository';
import type { RequestsService } from '../requests/requests.service';
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
    ...overrides,
  };
}

describe('RepliesService', () => {
  let repliesRepository: jest.Mocked<RepliesRepository>;
  let requestsService: jest.Mocked<RequestsService>;
  let repliesService: RepliesService;

  beforeEach(() => {
    repliesRepository = {
      create: jest.fn(),
      findVisibleById: jest.fn(),
      findVisibleByRequestId: jest.fn(),
      findByRequestAndAuthor: jest.fn(),
      countByRequestAndGuest: jest.fn(),
      setHidden: jest.fn(),
    } as unknown as jest.Mocked<RepliesRepository>;
    requestsService = {
      findVisibleById: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;

    repliesService = new RepliesService(repliesRepository, requestsService);
  });

  describe('create', () => {
    it('throws when the target request does not exist or is hidden', async () => {
      requestsService.findVisibleById.mockResolvedValue(undefined);

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용' },
          'user-1',
          undefined,
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
          undefined,
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
        undefined,
      );

      expect(repliesRepository.create).toHaveBeenCalledWith({
        requestId: 'request-1',
        body: '내용',
        authorId: 'user-1',
      });
      expect(result).toEqual(created);
    });

    it('throws when there is no session and no guestId', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());

      await expect(
        repliesService.create(
          'request-1',
          { body: '내용' },
          undefined,
          undefined,
        ),
      ).rejects.toBeInstanceOf(GuestIdRequiredException);
    });

    it('throws when the guest already replied 5 times to this request', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      repliesRepository.countByRequestAndGuest.mockResolvedValue(5);

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
      repliesRepository.countByRequestAndGuest.mockResolvedValue(4);
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
    });
  });

  describe('hide', () => {
    it('delegates to the repository', async () => {
      await repliesService.hide('reply-1');

      expect(repliesRepository.setHidden).toHaveBeenCalledWith('reply-1', true);
    });
  });
});
