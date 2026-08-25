import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
    // Default budget for every route: 100 req/60s per IP. Auth's
    // signup/login override this to a tighter limit (see auth.controller.ts)
    // since those are the classic brute-force/spam-signup targets.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
