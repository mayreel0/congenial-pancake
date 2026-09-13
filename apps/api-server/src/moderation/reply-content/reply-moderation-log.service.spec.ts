import { ReplyModerationLogService } from './reply-moderation-log.service';
import type { ReplyModerationLogsRepository } from './reply-moderation-logs.repository';

describe('ReplyModerationLogService', () => {
  it('records a moderation result for dry-run analysis', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    } as unknown as jest.Mocked<ReplyModerationLogsRepository>;
    const service = new ReplyModerationLogService(repository);

    await expect(
      service.recordDryRunResult('reply-1', {
        action: 'uncertain',
        categories: [],
        severity: 0,
        confidence: 0,
        reason: '답장 안전도 판정에 실패했습니다.',
        suggestions: [],
        telemetry: {
          shouldPersistForTraining: true,
          errorReason: 'OpenAI reply moderation timed out',
        },
      }),
    ).resolves.toEqual({ id: 'log-1' });

    expect(repository.create).toHaveBeenCalledWith({
      replyId: 'reply-1',
      action: 'uncertain',
      categories: [],
      severity: 0,
      confidence: 0,
      reason: '답장 안전도 판정에 실패했습니다.',
      suggestions: [],
      errorReason: 'OpenAI reply moderation timed out',
      shouldPersistForTraining: true,
    });
  });

  it('preserves excluded traffic metadata', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    } as unknown as jest.Mocked<ReplyModerationLogsRepository>;
    const service = new ReplyModerationLogService(repository);

    await service.recordDryRunResult('reply-1', {
      action: 'allow',
      categories: [],
      severity: 0,
      confidence: 1,
      reason: '부하테스트 트래픽은 학습/평가/통계에서 제외합니다.',
      suggestions: [],
      telemetry: {
        shouldPersistForTraining: false,
        excludedReason: 'load_test',
      },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shouldPersistForTraining: false,
        excludedReason: 'load_test',
      }),
    );
  });
});
