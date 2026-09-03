import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LandingModule } from './landing/landing.module';
import { ModerationModule } from './moderation/moderation.module';
import { ProfileModule } from './profile/profile.module';
import { RepliesModule } from './replies/replies.module';
import { ReportsModule } from './reports/reports.module';
import { RequestsModule } from './requests/requests.module';
import { SavedRepliesModule } from './saved-replies/saved-replies.module';
import { UsersModule } from './users/users.module';
import { ZodValidationPipe } from './common/zod-validation';

@Module({
  imports: [
    // Default budget for every route: 100 req/60s per IP. Auth's
    // signup/login override this to a tighter limit (see auth.controller.ts)
    // since those are the classic brute-force/spam-signup targets.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
        // Load-test escape hatch (see load-test/README.md and
        // docs/decisions/2026-09-04-onseol-load-test-scope-decisions.md) —
        // without this, every k6 VU shares one real source IP and the
        // throttle caps the whole test at 100 req/60s regardless of how
        // much the app/DB could actually handle. Double-gated: never
        // active when NODE_ENV is production, and even outside production
        // requires a secret the operator sets by hand (empty by default,
        // so plain `NODE_ENV=development` alone never enables this).
        skipIf: (context) => {
          if (process.env.NODE_ENV === 'production') return false;
          const token = process.env.LOAD_TEST_BYPASS_TOKEN;
          if (!token) return false;
          const request = context.switchToHttp().getRequest<Request>();
          return request.headers['x-load-test-bypass'] === token;
        },
      },
    ]),
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
    ProfileModule,
    LandingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Every controller input is now a zod DTO (createZodDto(...)); reject
    // anything with fields a DTO doesn't declare, same as the old
    // class-validator ValidationPipe — see common/zod-validation.ts.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Serializes/validates every response typed with @ZodResponse against
    // its DTO's schema.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
