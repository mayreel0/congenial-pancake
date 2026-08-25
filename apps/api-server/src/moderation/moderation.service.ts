import { Injectable } from '@nestjs/common';
import { RepliesService } from '../replies/replies.service';
import { RequestsService } from '../requests/requests.service';

// Distinct reporters required before a request/reply is auto-hidden — see
// docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md.
export const AUTO_HIDE_REPORTER_THRESHOLD = 3;

export type ReportTargetType = 'request' | 'reply';

@Injectable()
export class ModerationService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly repliesService: RepliesService,
  ) {}

  async evaluateAutoHide(
    targetType: ReportTargetType,
    targetId: string,
    distinctReporterCount: number,
  ): Promise<void> {
    if (distinctReporterCount < AUTO_HIDE_REPORTER_THRESHOLD) return;

    if (targetType === 'request') {
      await this.requestsService.hide(targetId);
    } else {
      await this.repliesService.hide(targetId);
    }
  }
}
