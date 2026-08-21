import {
  GuestIdRequiredException,
  RequestGuestLimitExceededException,
} from '../common/exceptions/app.exception';
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
    ...overrides,
  };
}

describe('RequestsService', () => {
  let requestsRepository: jest.Mocked<RequestsRepository>;
  let requestsService: RequestsService;

  beforeEach(() => {
    requestsRepository = {
      create: jest.fn(),
      findVisibleById: jest.fn(),
      findVisible: jest.fn(),
      findByGuestId: jest.fn(),
      setHidden: jest.fn(),
    } as unknown as jest.Mocked<RequestsRepository>;

    requestsService = new RequestsService(requestsRepository);
  });

  describe('create', () => {
    it('creates a request under the logged-in user without checking guestId', async () => {
      const created = makeRequest({ authorId: 'user-1' });
      requestsRepository.create.mockResolvedValue(created);

      const result = await requestsService.create(
        { body: '오늘 조금 힘들었어요.' },
        'user-1',
        undefined,
      );

      expect(requestsRepository.findByGuestId).not.toHaveBeenCalled();
      expect(requestsRepository.create).toHaveBeenCalledWith({
        body: '오늘 조금 힘들었어요.',
        authorId: 'user-1',
      });
      expect(result).toEqual(created);
    });

    it('throws when there is no session and no guestId', async () => {
      await expect(
        requestsService.create({ body: '내용' }, undefined, undefined),
      ).rejects.toBeInstanceOf(GuestIdRequiredException);
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
