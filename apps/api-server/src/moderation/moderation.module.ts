import { Module } from '@nestjs/common';
import { RepliesModule } from '../replies/replies.module';
import { RequestsModule } from '../requests/requests.module';
import { ModerationService } from './moderation.service';

@Module({
  imports: [RequestsModule, RepliesModule],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
