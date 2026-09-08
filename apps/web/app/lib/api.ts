// apiFetch/ApiError/login/logout/fetchCurrentUser/CurrentUser are byte-identical
// with apps/admin's copy, so they live in the shared "api" package — see
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md. signup and
// Google OAuth are apps/web-only (apps/admin has neither) and stay here.
import { apiFetch, API_BASE_URL, type CurrentUser } from "api";

export { apiFetch, ApiError, login, logout, fetchCurrentUser } from "api";
export type { CurrentUser } from "api";

// Requests a signup — creates nothing yet, just emails a link. Calling
// this again for the same address (a "resend") is exactly the same
// request; there's no separate resend concept.
export function signup(email: string): Promise<void> {
  return apiFetch<void>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Consumes the link signup sent — this is what actually creates the
// account (already verified) and logs it in.
export function completeSignup(
  token: string,
  password: string,
): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/complete-signup", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// 1-20 chars, not whitespace-only — enforced server-side (UpdateNicknameDto);
// this just surfaces whatever error message comes back.
export function updateNickname(nickname: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/nickname", {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

export type ProfileVisibilityPatch = {
  showRequestsOnProfile?: boolean;
  showRepliesOnProfile?: boolean;
  showCountsOnProfile?: boolean;
  // A pure visibility switch, not the same as clearing/changing the
  // nickname — never touches nickname/nicknameChangeAvailableAt, so
  // toggling it has no effect on the change cooldown. Because author
  // display is resolved live (not snapshotted per post), hiding it
  // retroactively hides the nickname on every past post too, and
  // un-hiding brings back the exact same nickname.
  nicknameVisible?: boolean;
};

export function updateProfileVisibility(
  patch: ProfileVisibilityPatch,
): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/profile-visibility", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// Consumes a one-off token issued from apps/admin (never self-service) —
// see docs/decisions/2026-08-27-onseol-oauth-password-reset-decisions.md.
export function resetPassword(token: string, password: string): Promise<void> {
  return apiFetch<void>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// Always logs the account out everywhere immediately. immediate=true skips
// the 30-day grace period and scrubs right away (not reversible); the
// default just starts the grace period, restorable via restoreAccount()
// until AccountDeletionCronService finalizes it server-side.
export function withdraw(immediate?: boolean): Promise<void> {
  return apiFetch<void>("/auth/withdraw", {
    method: "POST",
    body: JSON.stringify({ immediate }),
  });
}

// Only meaningful while the account is mid-grace-period (see
// CurrentUser.deletionGracePeriodEndsAt) — a no-op otherwise.
export function restoreAccount(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/restore-account", {
    method: "POST",
  });
}

export type OAuthProviderName = "google" | "kakao" | "naver";

export function oauthLoginUrl(provider: OAuthProviderName): string {
  return `${API_BASE_URL}/auth/${provider}`;
}
