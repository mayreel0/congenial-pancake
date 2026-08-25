import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env.schema';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { SessionService } from './session.service';
import type { AuthenticatedRequest } from './authenticated-request';

// Same token extraction as SessionGuard, but never rejects the request —
// routes that allow guest writes (requests/replies) use this to resolve
// request.userId when a valid session exists, and fall through to guest
// identification (GuestId decorator) otherwise.
@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) return true;

    const session = await this.sessionService.validateToken(token);
    if (session) {
      (request as AuthenticatedRequest).userId = session.userId;
    }
    return true;
  }

  private extractToken(request: Request): string | null {
    const cookieName = this.configService.get('SESSION_COOKIE_NAME', {
      infer: true,
    });
    const cookies = request.cookies as Record<string, string> | undefined;
    const cookieToken = cookies?.[cookieName];
    if (cookieToken) return cookieToken;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }

    return null;
  }
}
