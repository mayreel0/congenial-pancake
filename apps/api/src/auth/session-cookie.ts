import type { CookieOptions, Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

function cookieOptions(config: ConfigService<Env, true>): CookieOptions {
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // Frontend (Vercel) and backend (personal server) are different origins,
    // so a cross-site cookie needs SameSite=None in production. Locally
    // they're both on localhost at different ports, where Lax already works.
    sameSite: isProduction ? 'none' : 'lax',
  };
}

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
