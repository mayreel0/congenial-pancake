import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';

// Shared by the session cookie and the guest-id cookie. Lax everywhere:
// web (onseol.com), admin (a *.onseol.com subdomain) and this API
// (api.onseol.com) are different origins but the same *site* (same
// registrable domain), so browsers still attach Lax cookies to their
// fetches — and, unlike None, never to requests started from an unrelated
// site. Locally everything is on localhost, same site too. This was None
// until the backend moved off a separately-hosted server onto
// api.onseol.com — see docs/decisions/2026-09-24-onseol-cookie-samesite-lax-decisions.md.
export function cookieOptions(config: ConfigService<Env, true>): CookieOptions {
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  };
}
