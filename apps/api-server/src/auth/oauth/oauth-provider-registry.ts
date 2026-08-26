import { Injectable } from '@nestjs/common';
import { GoogleOAuthProvider } from './google-oauth.provider';
import { KakaoOAuthProvider } from './kakao-oauth.provider';
import { NaverOAuthProvider } from './naver-oauth.provider';
import type { OAuthProvider } from './oauth-provider.interface';

export const OAUTH_PROVIDER_NAMES = ['google', 'kakao', 'naver'] as const;
export type OAuthProviderName = (typeof OAUTH_PROVIDER_NAMES)[number];

function isOAuthProviderName(value: string): value is OAuthProviderName {
  return (OAUTH_PROVIDER_NAMES as readonly string[]).includes(value);
}

// Lets AuthController's :provider routes look up the right implementation
// by name instead of needing one pair of routes per provider — see
// docs/decisions/2026-08-26-onseol-kakao-naver-oauth-decisions.md.
@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: Record<OAuthProviderName, OAuthProvider>;

  constructor(
    google: GoogleOAuthProvider,
    kakao: KakaoOAuthProvider,
    naver: NaverOAuthProvider,
  ) {
    this.providers = { google, kakao, naver };
  }

  // Overloaded so a caller that's already narrowed `name` via isKnown()
  // gets a non-optional OAuthProvider back, instead of having to
  // null-check a value it just proved can't be undefined.
  get(name: OAuthProviderName): OAuthProvider;
  get(name: string): OAuthProvider | undefined;
  get(name: string): OAuthProvider | undefined {
    return isOAuthProviderName(name) ? this.providers[name] : undefined;
  }

  // Exposed separately (not just inferred from get() returning non-
  // undefined) so callers can narrow `name` itself to OAuthProviderName —
  // see AuthController's use of this before calling AuthService.
  isKnown(name: string): name is OAuthProviderName {
    return isOAuthProviderName(name);
  }
}
