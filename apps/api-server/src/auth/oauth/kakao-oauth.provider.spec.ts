import type { ConfigService } from '@nestjs/config';
import { OAuthExchangeFailedException } from '../../common/exceptions/app.exception';
import type { Env } from '../../config/env.schema';
import { KakaoOAuthProvider } from './kakao-oauth.provider';

function makeConfig(): jest.Mocked<ConfigService<Env, true>> {
  const values: Partial<Env> = {
    KAKAO_CLIENT_ID: 'client-id',
    KAKAO_CLIENT_SECRET: 'client-secret',
    API_PUBLIC_URL: 'http://localhost:3001',
  };
  return {
    get: jest.fn((key: keyof Env) => values[key]),
  } as unknown as jest.Mocked<ConfigService<Env, true>>;
}

describe('KakaoOAuthProvider', () => {
  let provider: KakaoOAuthProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    provider = new KakaoOAuthProvider(makeConfig());
    fetchMock = jest.fn();
    global.fetch = fetchMock;
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
            Promise.resolve({
              id: 123,
              kakao_account: {
                email: 'user@example.com',
                is_email_valid: true,
              },
            }),
        });

      const profile = await provider.exchangeCode('the-code');

      expect(profile).toEqual({
        providerAccountId: '123',
        email: 'user@example.com',
      });
    });

    it('throws when the profile has no email', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'at' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 123, kakao_account: {} }),
        });

      await expect(provider.exchangeCode('the-code')).rejects.toBeInstanceOf(
        OAuthExchangeFailedException,
      );
    });

    it('throws when Kakao reports the email as invalid', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'at' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 123,
              kakao_account: {
                email: 'user@example.com',
                is_email_valid: false,
              },
            }),
        });

      await expect(provider.exchangeCode('the-code')).rejects.toBeInstanceOf(
        OAuthExchangeFailedException,
      );
    });

    it('accepts the email when is_email_valid is absent', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'at' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 123,
              kakao_account: { email: 'user@example.com' },
            }),
        });

      const profile = await provider.exchangeCode('the-code');

      expect(profile.email).toBe('user@example.com');
    });
  });
});
