import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { OAuthExchangeFailedException } from '../../common/exceptions/app.exception';
import type { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const AUTHORIZE_URL = 'https://nid.naver.com/oauth2.0/authorize';
const TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const USERINFO_URL = 'https://openapi.naver.com/v1/nid/me';

type TokenResponse = { access_token: string };
type UserinfoResponse = {
  resultcode: string;
  response?: { id: string; email?: string };
};

@Injectable()
export class NaverOAuthProvider implements OAuthProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get redirectUri(): string {
    return `${this.config.get('API_PUBLIC_URL', { infer: true })}/auth/naver/callback`;
  }

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('NAVER_CLIENT_ID', { infer: true }),
      redirect_uri: this.redirectUri,
      response_type: 'code',
      // Without this, Naver silently reuses an existing nid.naver.com
      // session and there's no way for the user to switch accounts —
      // this forces the login screen every time, same as Kakao's `prompt:
      // 'login'`.
      auth_type: 'reprompt',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  // Naver's token endpoint also accepts (and checks) the same `state` it
  // issued at authorize time — pass it through instead of only relying on
  // our own oauth_state cookie check.
  async exchangeCode(code: string, state?: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.get('NAVER_CLIENT_ID', { infer: true }),
        client_secret: this.config.get('NAVER_CLIENT_SECRET', { infer: true }),
        redirect_uri: this.redirectUri,
        code,
        ...(state ? { state } : {}),
      }),
    });
    if (!tokenResponse.ok) throw new OAuthExchangeFailedException('naver');
    const token = (await tokenResponse.json()) as TokenResponse;

    const userinfoResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userinfoResponse.ok) throw new OAuthExchangeFailedException('naver');
    const profile = (await userinfoResponse.json()) as UserinfoResponse;
    if (profile.resultcode !== '00' || !profile.response?.email) {
      throw new OAuthExchangeFailedException('naver');
    }

    return {
      providerAccountId: profile.response.id,
      email: profile.response.email,
    };
  }
}
