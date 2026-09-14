import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.schema';
import { csrfOriginMiddleware } from './csrf-origin.middleware';

const ALLOWED = ['https://onseol.com', 'https://admin.onseol.com'];

function makeConfig(): ConfigService<Env, true> {
  return { get: () => ALLOWED } as unknown as ConfigService<Env, true>;
}

function makeReq(
  method: string,
  headers: Record<string, string> = {},
): Request {
  return { method, headers } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
}

describe('csrfOriginMiddleware', () => {
  const middleware = csrfOriginMiddleware(makeConfig());

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'always allows safe method %s regardless of Origin',
    (method) => {
      const req = makeReq(method, { origin: 'https://evil.example.com' });
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    },
  );

  it('allows a state-changing request with an allowed Origin', () => {
    const req = makeReq('POST', { origin: 'https://onseol.com' });
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a state-changing request with a foreign Origin', () => {
    const req = makeReq('POST', { origin: 'https://evil.example.com' });
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CSRF_ORIGIN_REJECTED' }),
    );
  });

  it('falls back to Referer when Origin is absent', () => {
    const req = makeReq('DELETE', {
      referer: 'https://evil.example.com/some/page',
    });
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows a state-changing request with an allowed Referer', () => {
    const req = makeReq('PATCH', {
      referer: 'https://onseol.com/me',
    });
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // Non-browser traffic (load-test scripts, health checks) never carries
  // the ambient session/guest cookies a CSRF attack rides on, so failing
  // open here doesn't reopen the vulnerability this middleware closes —
  // see the file's own comment for why a real cross-site browser request
  // always sends one of these two headers.
  it('allows a state-changing request with neither Origin nor Referer', () => {
    const req = makeReq('POST', {});
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
