import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

// Shared by the session cookie and the guest-id cookie — both are httpOnly
// and need the same secure/sameSite split. Frontend (Vercel) and backend
// (personal server) are different origins, so a cross-site cookie needs
// SameSite=None in production. Locally they're both on localhost at
// different ports, where Lax already works.
export function cookieOptions(config: ConfigService<Env, true>): CookieOptions {
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
}
