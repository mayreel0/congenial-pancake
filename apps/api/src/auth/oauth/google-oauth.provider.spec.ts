import type { ConfigService } from '@nestjs/config';
import { OAuthExchangeFailedException } from '../../common/exceptions/app.exception';
import type { Env } from '../../config/env.schema';
import { GoogleOAuthProvider } from './google-oauth.provider';

function makeConfig(): jest.Mocked<ConfigService<Env, true>> {
  const values: Partial<Env> = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    API_PUBLIC_URL: 'http://localhost:3001',
  };
  return {
    get: jest.fn((key: keyof Env) => values[key]),
  } as unknown as jest.Mocked<ConfigService<Env, true>>;
}

describe('GoogleOAuthProvider', () => {
  let provider: GoogleOAuthProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    provider = new GoogleOAuthProvider(makeConfig());
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  describe('getAuthorizeUrl', () => {
    it('builds the authorize URL with the exact callback redirect_uri', () => {
      const url = new URL(provider.getAuthorizeUrl('the-state'));

      expect(url.origin + url.pathname).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(url.searchParams.get('client_id')).toBe('client-id');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3001/auth/google/callback',
      );
      expect(url.searchParams.get('state')).toBe('the-state');
    });
  });

  describe('exchangeCode', () => {
    it('exchanges the code for a token then fetches the profile', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'at' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ sub: 'google-123', email: 'user@example.com' }),
        });

      const profile = await provider.exchangeCode('the-code');

      expect(profile).toEqual({
        providerAccountId: 'google-123',
        email: 'user@example.com',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws when the token exchange fails', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false });

      await expect(provider.exchangeCode('bad-code')).rejects.toBeInstanceOf(
        OAuthExchangeFailedException,
      );
    });

    it('throws when the profile has no email', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'at' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sub: 'google-123' }),
        });

      await expect(provider.exchangeCode('the-code')).rejects.toBeInstanceOf(
        OAuthExchangeFailedException,
      );
    });
  });
});
