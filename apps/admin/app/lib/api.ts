// This app has no signup, no Google OAuth — everything here is shared
// verbatim with apps/web's copy, so it lives in the "ui" package. See
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md.
export { apiFetch, ApiError, login, logout, fetchCurrentUser } from "ui/api";
export type { CurrentUser } from "ui/api";
