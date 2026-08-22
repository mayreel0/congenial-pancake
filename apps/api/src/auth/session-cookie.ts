import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { cookieOptions } from '../common/cookie-options';

export function setSessionCookie(
  res: Response,
  config: ConfigService<Env, true>,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(config.get('SESSION_COOKIE_NAME', { infer: true }), token, {
    ...cookieOptions(config),
    expires: expiresAt,
  });
}

export function clearSessionCookie(
  res: Response,
  config: ConfigService<Env, true>,
): void {
  res.clearCookie(
    config.get('SESSION_COOKIE_NAME', { infer: true }),
    cookieOptions(config),
  );
}
