import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.schema';
import type { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { OAuthProviderRegistry } from './oauth/oauth-provider-registry';
import type { PasswordResetService } from './password-reset/password-reset.service';
import type { SessionService } from './session.service';

describe('OAuth signup intent', () => {
  const profile = {
    providerAccountId: 'google-1',
    email: 'member@example.com',
  };
  const loginWithOAuth = jest.fn();
  const exchangeCode = jest.fn();
  const getAuthorizeUrl = jest.fn((state: string) => state);
  const validateToken = jest.fn();
  const config = {
    get: jest.fn((key: string) =>
      key === 'WEB_PUBLIC_URL' ? 'https://example.com' : 'session_token',
    ),
  };
  let controller: AuthController;
  let response: Response;
  const cookie = jest.fn();
  const redirect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    exchangeCode.mockResolvedValue(profile);
    loginWithOAuth.mockResolvedValue(null);
    controller = new AuthController(
      { loginWithOAuth } as unknown as AuthService,
      { validateToken } as unknown as SessionService,
      {} as UsersService,
      {
        isKnown: () => true,
        get: () => ({ exchangeCode, getAuthorizeUrl }),
      } as unknown as OAuthProviderRegistry,
      {} as PasswordResetService,
      config as unknown as ConfigService<Env, true>,
    );
    response = {
      cookie,
      redirect,
      clearCookie: jest.fn(),
    } as unknown as Response;
  });

  it.each([undefined, 'true'])(
    'binds signup intent to generated state (%s)',
    async (signup) => {
      await controller.oauthRedirect(
        'google',
        { query: { signup }, cookies: {} } as unknown as Request,
        response,
      );
      const state = getAuthorizeUrl.mock.calls[0][0];
      expect(state.startsWith('signup:')).toBe(signup === 'true');
      expect(cookie).toHaveBeenCalledWith(
        'oauth_state',
        state,
        expect.any(Object),
      );
    },
  );

  it.each(['random-state', 'signup:random-state'])(
    'uses only the validated state for signup permission (%s)',
    async (state) => {
      await controller.oauthCallback(
        'google',
        {
          query: { code: 'code', state, signup: 'true' },
          cookies: { oauth_state: state },
          headers: {},
        } as unknown as Request,
        response,
      );
      expect(loginWithOAuth).toHaveBeenCalledWith(
        'google',
        profile,
        undefined,
        state.startsWith('signup:'),
      );
      expect(redirect).toHaveBeenCalledWith(
        'https://example.com/login?mode=signup&signupRequired=1',
      );
      expect(cookie).not.toHaveBeenCalled();
    },
  );

  it('rejects a callback whose signup state differs from the cookie', async () => {
    await expect(
      controller.oauthCallback(
        'google',
        {
          query: { code: 'code', state: 'signup:random-state' },
          cookies: { oauth_state: 'random-state' },
          headers: {},
        } as unknown as Request,
        response,
      ),
    ).rejects.toThrow();
    expect(exchangeCode).not.toHaveBeenCalled();
    expect(loginWithOAuth).not.toHaveBeenCalled();
  });
});
