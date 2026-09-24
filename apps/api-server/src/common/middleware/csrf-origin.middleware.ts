import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Env } from '../../config/env.schema';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

// Added while the session and guest_id cookies were SameSite=None, when
// browsers attached them to state-changing cross-site requests too (a
// hidden <form> POST on any unrelated page — confirmed locally: a
// form-urlencoded POST /requests with a spoofed cross-site Origin header
// was parsed and created a real row before this middleware existed). The
// cookies are Lax now (see cookie-options.ts), which already keeps them off
// cross-site POSTs; this stays as a second layer in case that ever
// changes, and because a sibling subdomain counts as the same site to
// SameSite but not to this Origin allowlist. CORS only stops an attacker's
// own JS from *reading* the response; it never stops the request from
// being sent and processed. Origin/Referer, unlike a request body, is set
// by the browser itself and can't be forged by page JS.
//
// Deliberately fails OPEN when neither header is present — real browsers
// always send Origin on a cross-site POST/PUT/PATCH/DELETE (and same-origin
// fetches send it too, in every browser this app targets), so the only
// traffic missing both is non-browser (load-test scripts, health checks),
// which was never carrying ambient cookies a CSRF attack could ride on
// anyway. Only reject when a signal is present and it doesn't match.
export function csrfOriginMiddleware(
  config: ConfigService<Env, true>,
): RequestHandler {
  const allowedOrigins = new Set(config.get('CORS_ORIGIN', { infer: true }));

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = req.headers.origin ?? originOf(req.headers.referer ?? '');
    if (!origin || allowedOrigins.has(origin)) {
      next();
      return;
    }

    res.status(403).json({
      statusCode: 403,
      code: 'CSRF_ORIGIN_REJECTED',
      message: 'Request origin is not allowed.',
    });
  };
}
