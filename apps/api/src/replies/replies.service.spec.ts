import type { AnswerInteractionsService } from '../answer-interactions/answer-interactions.service';
import {
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
  let answerInteractionsService: jest.Mocked<AnswerInteractionsService>;
  let repliesService: RepliesService;

  beforeEach(() => {
    repliesRepository = {
      create: jest.fn(),
      findVisibleById: jest.fn(),
      findVisibleByRequestId: jest.fn(),
      findByRequestAndAuthor: jest.fn(),
      countByRequestAndGuest: jest.fn(),
      setHidden: jest.fn(),
      findMine: jest.fn(),
    } as unknown as jest.Mocked<RepliesRepository>;
    requestsService = {
      findVisibleById: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;
    answerInteractionsService = {
      clearForViewer: jest.fn(),
    } as unknown as jest.Mocked<AnswerInteractionsService>;

    repliesService = new RepliesService(
      repliesRepository,
      requestsService,
      answerInteractionsService,
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
      });
      expect(result).toEqual(created);
      // Answering resolves any held/skipped state for this viewer+request.
      expect(answerInteractionsService.clearForViewer).toHaveBeenCalledWith(
        'request-1',
        'user-1',
        undefined,
      );
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
