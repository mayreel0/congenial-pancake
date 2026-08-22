import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ModerationModule } from './moderation/moderation.module';
import { RepliesModule } from './replies/replies.module';
import { ReportsModule } from './reports/reports.module';
import { RequestsModule } from './requests/requests.module';
import { SavedRepliesModule } from './saved-replies/saved-replies.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    UsersModule,
    RequestsModule,
    RepliesModule,
    ReportsModule,
    SavedRepliesModule,
    ModerationModule,
    AdminModule,
  ],
})
export class AppModule {}
