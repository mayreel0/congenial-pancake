import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RepliesModule } from '../replies/replies.module';
import { RequestsModule } from '../requests/requests.module';
import { ModerationService } from './moderation.service';
import { ReplyModerationLogService } from './reply-content/reply-moderation-log.service';
import { ReplyModerationLogsRepository } from './reply-content/reply-moderation-logs.repository';

@Module({
  imports: [DatabaseModule, RequestsModule, RepliesModule],
  providers: [
    ModerationService,
    ReplyModerationLogService,
    ReplyModerationLogsRepository,
  ],
  exports: [ModerationService, ReplyModerationLogService],
})
export class ModerationModule {}
