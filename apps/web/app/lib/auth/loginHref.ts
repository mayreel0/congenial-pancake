// Builds the "로그인" link a not-logged-in page shows so /login can send
// the viewer back here after signing in — see app/login/lib/safeReturnTo.ts
// for the matching read/validation side.
export function loginHrefWithReturnTo(pathname: string): string {
  return `/login?returnTo=${encodeURIComponent(pathname)}`;
}
