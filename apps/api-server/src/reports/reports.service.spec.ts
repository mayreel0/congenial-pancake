import {
  ReplyNotFoundException,
  ReportAlreadySubmittedException,
  RequestNotFoundException,
} from '../common/exceptions/app.exception';
import type { ReplyRecord } from '../replies/replies.repository';
import type { RepliesService } from '../replies/replies.service';
import type { RequestRecord } from '../requests/requests.repository';
import type { RequestsService } from '../requests/requests.service';
import type { ModerationService } from '../moderation/moderation.service';
import type { ReportRecord, ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

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
    ...overrides,
  };
}

function makeReply(overrides: Partial<ReplyRecord> = {}): ReplyRecord {
  return {
    id: 'reply-1',
    requestId: 'request-1',
    body: '괜찮아요.',
    authorId: 'author-2',
    guestId: null,
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    hidden: false,
    deletedAt: null,
    reviewedAt: null,
    ...overrides,
  };
}

function makeReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: 'report-1',
    targetType: 'request',
    targetId: 'request-1',
    reporterId: 'reporter-1',
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ReportsService', () => {
  let reportsRepository: jest.Mocked<ReportsRepository>;
  let requestsService: jest.Mocked<RequestsService>;
  let repliesService: jest.Mocked<RepliesService>;
  let moderationService: jest.Mocked<ModerationService>;
  let reportsService: ReportsService;

  beforeEach(() => {
    reportsRepository = {
      create: jest.fn(),
      findByTargetAndReporter: jest.fn(),
      countDistinctReporters: jest.fn(),
    } as unknown as jest.Mocked<ReportsRepository>;
    requestsService = {
      findVisibleById: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;
    repliesService = {
      findVisibleById: jest.fn(),
    } as unknown as jest.Mocked<RepliesService>;
    moderationService = {
      evaluateAutoHide: jest.fn(),
    } as unknown as jest.Mocked<ModerationService>;

    reportsService = new ReportsService(
      reportsRepository,
      requestsService,
      repliesService,
      moderationService,
    );
  });

  describe('create', () => {
    it('throws when the target request does not exist', async () => {
      requestsService.findVisibleById.mockResolvedValue(undefined);

      await expect(
        reportsService.create(
          { targetType: 'request', targetId: 'request-1' },
          'reporter-1',
        ),
      ).rejects.toBeInstanceOf(RequestNotFoundException);
    });

    it('throws when the target reply does not exist', async () => {
      repliesService.findVisibleById.mockResolvedValue(undefined);

      await expect(
        reportsService.create(
          { targetType: 'reply', targetId: 'reply-1' },
          'reporter-1',
        ),
      ).rejects.toBeInstanceOf(ReplyNotFoundException);
    });

    it('throws when the same reporter already reported this target', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      reportsRepository.findByTargetAndReporter.mockResolvedValue(makeReport());

      await expect(
        reportsService.create(
          { targetType: 'request', targetId: 'request-1' },
          'reporter-1',
        ),
      ).rejects.toBeInstanceOf(ReportAlreadySubmittedException);
    });

    it('records the report and asks moderation to evaluate auto-hide', async () => {
      requestsService.findVisibleById.mockResolvedValue(makeRequest());
      reportsRepository.findByTargetAndReporter.mockResolvedValue(undefined);
      reportsRepository.countDistinctReporters.mockResolvedValue(3);

      await reportsService.create(
        { targetType: 'request', targetId: 'request-1' },
        'reporter-1',
      );

      expect(reportsRepository.create).toHaveBeenCalledWith({
        targetType: 'request',
        targetId: 'request-1',
        reporterId: 'reporter-1',
      });
      expect(reportsRepository.countDistinctReporters).toHaveBeenCalledWith(
        'request',
        'request-1',
        undefined,
      );
      expect(moderationService.evaluateAutoHide).toHaveBeenCalledWith(
        'request',
        'request-1',
        3,
      );
    });

    it('records a report against a reply target', async () => {
      repliesService.findVisibleById.mockResolvedValue(makeReply());
      reportsRepository.findByTargetAndReporter.mockResolvedValue(undefined);
      reportsRepository.countDistinctReporters.mockResolvedValue(1);

      await reportsService.create(
        { targetType: 'reply', targetId: 'reply-1' },
        'reporter-1',
      );

      expect(reportsRepository.create).toHaveBeenCalledWith({
        targetType: 'reply',
        targetId: 'reply-1',
        reporterId: 'reporter-1',
      });
      expect(moderationService.evaluateAutoHide).toHaveBeenCalledWith(
        'reply',
        'reply-1',
        1,
      );
    });

    it('only counts reports created after the target was last reviewed', async () => {
      const reviewedAt = new Date('2026-08-24T00:00:00.000Z');
      requestsService.findVisibleById.mockResolvedValue(
        makeRequest({ reviewedAt }),
      );
      reportsRepository.findByTargetAndReporter.mockResolvedValue(undefined);
      reportsRepository.countDistinctReporters.mockResolvedValue(1);

      await reportsService.create(
        { targetType: 'request', targetId: 'request-1' },
        'reporter-1',
      );

      expect(reportsRepository.countDistinctReporters).toHaveBeenCalledWith(
        'request',
        'request-1',
        reviewedAt,
      );
    });
  });
});
