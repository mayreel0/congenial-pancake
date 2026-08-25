// apiFetch/ApiError/login/logout/fetchCurrentUser/CurrentUser are byte-identical
// with apps/admin's copy, so they live in the shared "ui" package — see
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md. signup and
// Google OAuth are apps/web-only (apps/admin has neither) and stay here.
import { apiFetch, API_BASE_URL, type CurrentUser } from "ui/api";

export { apiFetch, ApiError, login, logout, fetchCurrentUser } from "ui/api";
export type { CurrentUser } from "ui/api";

export function signup(email: string, password: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function googleLoginUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}
