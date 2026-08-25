import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

// Must run after SessionGuard (which sets request.userId) — see
// docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md's
// "관리자 식별" decision: no role table, just an env-var whitelist of
// user ids, sized for single-operator scale.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const adminUserIds = this.config.get('ADMIN_USER_IDS', { infer: true });
    if (!adminUserIds.includes(request.userId)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
