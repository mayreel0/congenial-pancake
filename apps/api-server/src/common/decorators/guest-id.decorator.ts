import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { GUEST_ID_COOKIE_NAME } from '../guest-id.constants';

// Anonymous writers are identified by a server-issued httpOnly cookie (see
// GuestIdMiddleware, registered globally in main.ts) — it's always present
// by the time a request reaches a route handler, since the middleware runs
// before Nest's routing for every request.
export const GuestId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, string>;
    return cookies[GUEST_ID_COOKIE_NAME];
  },
);
