import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RepliesModule } from '../replies/replies.module';
import { RequestsModule } from '../requests/requests.module';
import { ModerationService } from './moderation.service';

@Module({
  imports: [DatabaseModule, RequestsModule, RepliesModule],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
