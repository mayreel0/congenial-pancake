// This app has no signup, no Google OAuth — everything here is shared
// verbatim with apps/web's copy, so it lives in the "api" package. See
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md.
export { apiFetch, ApiError, login, logout, fetchCurrentUser } from "api";
export type { CurrentUser } from "api";
