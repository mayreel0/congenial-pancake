import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Pairs with OptionalSessionGuard, which only sets userId when a valid
// session was found — so unlike CurrentUser() (AuthenticatedRequest,
// userId always a string), this reads a request where userId is honestly
// optional and returns undefined when the caller has no session.
export const OptionalCurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { userId?: string }>();
    return request.userId;
  },
);
