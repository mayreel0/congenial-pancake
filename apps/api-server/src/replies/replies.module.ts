import { Module } from '@nestjs/common';
import { AnswerInteractionsModule } from '../answer-interactions/answer-interactions.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RequestsModule } from '../requests/requests.module';
import { SettingsModule } from '../settings/settings.module';
import { RepliesController } from './replies.controller';
import { RepliesMineController } from './replies-mine.controller';
import { RepliesRepository } from './replies.repository';
import { RepliesService } from './replies.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    RequestsModule,
    AnswerInteractionsModule,
    SettingsModule,
  ],
  controllers: [RepliesController, RepliesMineController],
  providers: [RepliesRepository, RepliesService],
  exports: [RepliesService],
})
export class RepliesModule {}
