import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnswerInteractionsRepository } from './answer-interactions.repository';
import { AnswerInteractionsService } from './answer-interactions.service';

@Module({
  imports: [DatabaseModule],
  providers: [AnswerInteractionsRepository, AnswerInteractionsService],
  exports: [AnswerInteractionsService],
})
export class AnswerInteractionsModule {}
