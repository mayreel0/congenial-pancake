import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Env } from '../../config/env.schema';
import { cookieOptions } from '../cookie-options';
import {
  GUEST_ID_COOKIE_MAX_AGE_MS,
  GUEST_ID_COOKIE_NAME,
} from '../guest-id.constants';

// Ensures every request carries a server-issued, httpOnly guest_id cookie —
// replaces the old client-generated-and-localStorage-stored id, which was
// one devtools line to edit or clear. Registered as a global app.use()
// (not a Nest module middleware) so it's guaranteed to run right after
// cookie-parser and before any routing/guards, for every route — see
// docs/decisions/2026-08-23-onseol-guest-id-cookie-decisions.md.
export function guestIdMiddleware(
  config: ConfigService<Env, true>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const cookies = req.cookies as Record<string, string> | undefined;
    if (cookies?.[GUEST_ID_COOKIE_NAME]) {
      next();
      return;
    }

    const guestId = randomUUID();
    res.cookie(GUEST_ID_COOKIE_NAME, guestId, {
      ...cookieOptions(config),
      maxAge: GUEST_ID_COOKIE_MAX_AGE_MS,
    });
    req.cookies = { ...(cookies ?? {}), [GUEST_ID_COOKIE_NAME]: guestId };
    next();
  };
}
