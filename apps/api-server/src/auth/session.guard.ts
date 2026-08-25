import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env.schema';
import { SessionService } from './session.service';
import type { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    const session = await this.sessionService.validateToken(token);
    if (!session) throw new UnauthorizedException();

    (request as AuthenticatedRequest).userId = session.userId;
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
