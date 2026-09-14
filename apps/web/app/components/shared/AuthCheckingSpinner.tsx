// Shown on every login-required page while auth status itself is still
// resolving (useAuth().status === "loading") — deliberately not shaped
// like the eventual authenticated layout. A page's own content-shaped
// skeleton (e.g. SettingsFormSkeleton, RequestLogBody's loading branch)
// only appears once we already know the viewer is authenticated and are
// just waiting on that page's own data — this component covers the earlier
// "don't know yet" gap, so a guest never sees a full page of
// member-only-shaped placeholders before the login prompt.
//
// Centered with generous vertical room (min-h-[60vh], not an exact
// viewport-minus-header calc — the page itself no longer vertically
// centers its real content, but a lone loading indicator with nothing
// else on screen reads better centered; a fixed vh value can't ever push
// the page past one viewport the way a calc(100dvh - header) subtraction
// once did (that caused a real 1px scroll bug, see /me·/settings·/records'
// history), so this stays generous without risk. 2026-09-14 feedback: the
// original small inline version (h-4 spinner, text beside it) didn't read
// as a loading state at all.
export function AuthCheckingSpinner() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted"
      data-testid="auth-checking-spinner"
    >
      <div
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-foreground"
      />
      <p className="text-sm">불러오는 중…</p>
    </div>
  );
}
