import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { OAuthExchangeFailedException } from '../../common/exceptions/app.exception';
import type { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

type TokenResponse = { access_token: string };
type UserinfoResponse = { sub: string; email?: string };

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get redirectUri(): string {
    return `${this.config.get('API_PUBLIC_URL', { infer: true })}/auth/google/callback`;
  }

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
        client_secret: this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new OAuthExchangeFailedException('google');
    const token = (await tokenResponse.json()) as TokenResponse;

    const userinfoResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userinfoResponse.ok) throw new OAuthExchangeFailedException('google');
    const profile = (await userinfoResponse.json()) as UserinfoResponse;
    if (!profile.email) throw new OAuthExchangeFailedException('google');

    return { providerAccountId: profile.sub, email: profile.email };
  }
}
