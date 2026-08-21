import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RequestsModule } from '../requests/requests.module';
import { RepliesController } from './replies.controller';
import { RepliesRepository } from './replies.repository';
import { RepliesService } from './replies.service';

@Module({
  imports: [DatabaseModule, AuthModule, RequestsModule],
  controllers: [RepliesController],
  providers: [RepliesRepository, RepliesService],
  exports: [RepliesService],
})
export class RepliesModule {}
