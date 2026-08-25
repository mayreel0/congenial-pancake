export type OAuthProfile = {
  providerAccountId: string;
  email: string;
};

export interface OAuthProvider {
  getAuthorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthProfile>;
}
