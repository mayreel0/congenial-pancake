// apiFetch/ApiError/login/logout/fetchCurrentUser/CurrentUser are byte-identical
// with apps/admin's copy, so they live in the shared "api" package — see
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md. signup and
// Google OAuth are apps/web-only (apps/admin has neither) and stay here.
import { apiFetch, API_BASE_URL, type CurrentUser } from "api";

export { apiFetch, ApiError, login, logout, fetchCurrentUser } from "api";
export type { CurrentUser } from "api";

export function signup(email: string, password: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type OAuthProviderName = "google" | "kakao" | "naver";

export function oauthLoginUrl(provider: OAuthProviderName): string {
  return `${API_BASE_URL}/auth/${provider}`;
}
