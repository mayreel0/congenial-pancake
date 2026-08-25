import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { AnswerInteractionsRepository } from './answer-interactions.repository';
import { AnswerInteractionsService } from './answer-interactions.service';

@Module({
  imports: [DatabaseModule, SettingsModule],
  providers: [AnswerInteractionsRepository, AnswerInteractionsService],
  exports: [AnswerInteractionsService],
})
export class AnswerInteractionsModule {}
