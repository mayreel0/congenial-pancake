import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const GUEST_ID_HEADER = 'x-guest-id';

// Anonymous writers identify themselves with a client-generated id sent on
// this header (see requests/replies — logged-in writers use their session
// instead). Express lower-cases header names, so the constant above must
// stay lower-case.
export const GuestId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const value = request.headers[GUEST_ID_HEADER];
    return typeof value === 'string' ? value : undefined;
  },
);
