import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { cookieOptions } from './cookie-options';

function makeConfig(nodeEnv: string): ConfigService<Env, true> {
  return { get: () => nodeEnv } as unknown as ConfigService<Env, true>;
}

describe('cookieOptions', () => {
  it('is Lax and Secure in production', () => {
    expect(cookieOptions(makeConfig('production'))).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
  });

  it('is Lax and not Secure outside production (plain-http localhost)', () => {
    expect(cookieOptions(makeConfig('development'))).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  });
});
