import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { OAuthExchangeFailedException } from '../../common/exceptions/app.exception';
import type { OAuthProfile, OAuthProvider } from './oauth-provider.interface';

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const USERINFO_URL = 'https://kapi.kakao.com/v2/user/me';

type TokenResponse = { access_token: string };
type UserinfoResponse = {
  id: number;
  kakao_account?: { email?: string; is_email_valid?: boolean };
};

@Injectable()
export class KakaoOAuthProvider implements OAuthProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get redirectUri(): string {
    return `${this.config.get('API_PUBLIC_URL', { infer: true })}/auth/kakao/callback`;
  }

  getAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('KAKAO_CLIENT_ID', { infer: true }),
      redirect_uri: this.redirectUri,
      response_type: 'code',
      // Without this, Kakao silently reuses an existing kakao.com session
      // and there's no way for the user to switch accounts — this forces
      // the login screen every time.
      prompt: 'login',
      // Without this, Kakao never prompts for (or returns) email consent —
      // see the email-scope note on exchangeCode() below.
      scope: 'account_email',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.get('KAKAO_CLIENT_ID', { infer: true }),
        client_secret: this.config.get('KAKAO_CLIENT_SECRET', { infer: true }),
        redirect_uri: this.redirectUri,
        code,
      }),
    });
    if (!tokenResponse.ok) throw new OAuthExchangeFailedException('kakao');
    const token = (await tokenResponse.json()) as TokenResponse;

    const userinfoResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userinfoResponse.ok) throw new OAuthExchangeFailedException('kakao');
    const profile = (await userinfoResponse.json()) as UserinfoResponse;
    // Kakao only returns kakao_account.email when the app has the email
    // scope approved (requires business channel verification for
    // production apps) and the user consented — without it this is
    // undefined, and we treat that the same as any other exchange failure
    // rather than creating an account with no email.
    const email = profile.kakao_account?.email;
    if (!email) throw new OAuthExchangeFailedException('kakao');

    return { providerAccountId: String(profile.id), email };
  }
}
