import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { RepliesModule } from '../replies/replies.module';
import { SavedRepliesController } from './saved-replies.controller';
import { SavedRepliesRepository } from './saved-replies.repository';
import { SavedRepliesService } from './saved-replies.service';

@Module({
  imports: [DatabaseModule, AuthModule, RepliesModule],
  controllers: [SavedRepliesController],
  providers: [SavedRepliesRepository, SavedRepliesService],
})
export class SavedRepliesModule {}
