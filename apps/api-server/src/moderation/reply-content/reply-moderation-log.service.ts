import { Injectable } from '@nestjs/common';
import type { ModerationResult } from './reply-content-moderation.types';
import {
  ReplyModerationLogsRepository,
  type ReplyModerationLogRecord,
} from './reply-moderation-logs.repository';

@Injectable()
export class ReplyModerationLogService {
  constructor(private readonly repository: ReplyModerationLogsRepository) {}

  recordDryRunResult(
    replyId: string,
    result: ModerationResult,
  ): Promise<ReplyModerationLogRecord> {
    return this.repository.create({
      replyId,
      action: result.action,
      categories: result.categories,
      severity: result.severity,
      confidence: result.confidence,
      reason: result.reason,
      suggestions: result.suggestions,
      errorReason: result.telemetry.errorReason,
      shouldPersistForTraining: result.telemetry.shouldPersistForTraining,
      excludedReason: result.telemetry.excludedReason,
    });
  }
}
