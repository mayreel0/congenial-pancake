export type OAuthProfile = {
  providerAccountId: string;
  email: string;
};

export interface OAuthProvider {
  getAuthorizeUrl(state: string): string;
  // `state` is optional here even though every provider receives it as an
  // authorize-time param — only Naver's token endpoint also wants it
  // echoed back at exchange time (extra CSRF check on their side); Google
  // and Kakao's implementations just ignore the second argument.
  exchangeCode(code: string, state?: string): Promise<OAuthProfile>;
}
