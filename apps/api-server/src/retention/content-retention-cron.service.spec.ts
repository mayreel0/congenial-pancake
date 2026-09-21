import type { ContentRetentionRepository } from './content-retention.repository';
import {
  ContentRetentionCronService,
  REMOVED_CONTENT_RETENTION_DAYS,
} from './content-retention-cron.service';

describe('ContentRetentionCronService', () => {
  let repository: jest.Mocked<ContentRetentionRepository>;
  let service: ContentRetentionCronService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-22T05:00:00.000Z'));
    repository = {
      purgeRemovedContent: jest
        .fn()
        .mockResolvedValue({ requests: 0, replies: 0 }),
    } as unknown as jest.Mocked<ContentRetentionRepository>;
    service = new ContentRetentionCronService(repository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('purges content removed more than the published retention period ago', async () => {
    await service.purgeRemovedContent();

    expect(REMOVED_CONTENT_RETENTION_DAYS).toBe(30);
    expect(repository.purgeRemovedContent).toHaveBeenCalledWith(
      new Date('2026-08-23T05:00:00.000Z'),
    );
  });
});
