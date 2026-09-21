import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ContentRetentionCronService } from './content-retention-cron.service';
import { ContentRetentionRepository } from './content-retention.repository';

@Module({
  imports: [DatabaseModule],
  providers: [ContentRetentionRepository, ContentRetentionCronService],
})
export class RetentionModule {}
