import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContentRetentionRepository } from './content-retention.repository';

// Published in the privacy policy (개인정보 처리방침) — change it there too.
export const REMOVED_CONTENT_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Same once-a-day, no-finer-scheduler reasoning as AccountDeletionCronService
// — a day's imprecision on a 30-day window is immaterial.
@Injectable()
export class ContentRetentionCronService {
  private readonly logger = new Logger(ContentRetentionCronService.name);

  constructor(private readonly repository: ContentRetentionRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async purgeRemovedContent(): Promise<void> {
    const cutoff = new Date(
      Date.now() - REMOVED_CONTENT_RETENTION_DAYS * MS_PER_DAY,
    );
    const purged = await this.repository.purgeRemovedContent(cutoff);
    if (purged.requests > 0 || purged.replies > 0) {
      this.logger.log(
        `Purged removed content: ${purged.requests} request(s), ${purged.replies} reply(ies).`,
      );
    }
  }
}
