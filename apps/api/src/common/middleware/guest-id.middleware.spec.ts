import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.schema';
import { GUEST_ID_COOKIE_NAME } from '../guest-id.constants';
import { guestIdMiddleware } from './guest-id.middleware';

function makeConfig(nodeEnv: string): ConfigService<Env, true> {
  return { get: () => nodeEnv } as unknown as ConfigService<Env, true>;
}

function makeRes(): Response {
  return { cookie: jest.fn() } as unknown as Response;
}

describe('guestIdMiddleware', () => {
  it('issues a new cookie and attaches it to the request when none exists', () => {
    const middleware = guestIdMiddleware(makeConfig('development'));
    const req = { cookies: {} } as unknown as Request;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue, options] = (res.cookie as jest.Mock).mock
      .calls[0] as [string, string, Record<string, unknown>];
    expect(cookieName).toBe(GUEST_ID_COOKIE_NAME);
    expect(typeof cookieValue).toBe('string');
    expect(cookieValue.length).toBeGreaterThan(0);
    expect(options).toMatchObject({ httpOnly: true });
    expect((req.cookies as Record<string, string>)[GUEST_ID_COOKIE_NAME]).toBe(
      cookieValue,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves an existing cookie untouched', () => {
    const middleware = guestIdMiddleware(makeConfig('development'));
    const req = {
      cookies: { [GUEST_ID_COOKIE_NAME]: 'existing-guest-id' },
    } as unknown as Request;
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect((req.cookies as Record<string, string>)[GUEST_ID_COOKIE_NAME]).toBe(
      'existing-guest-id',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
