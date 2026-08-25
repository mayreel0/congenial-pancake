import { Module } from '@nestjs/common';
import { AnswerInteractionsModule } from '../answer-interactions/answer-interactions.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RequestsController } from './requests.controller';
import { RequestsRepository } from './requests.repository';
import { RequestsService } from './requests.service';

@Module({
  imports: [DatabaseModule, AuthModule, AnswerInteractionsModule],
  controllers: [RequestsController],
  providers: [RequestsRepository, RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
