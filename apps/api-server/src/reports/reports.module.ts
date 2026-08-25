import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ModerationModule } from '../moderation/moderation.module';
import { RepliesModule } from '../replies/replies.module';
import { RequestsModule } from '../requests/requests.module';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    RequestsModule,
    RepliesModule,
    ModerationModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
