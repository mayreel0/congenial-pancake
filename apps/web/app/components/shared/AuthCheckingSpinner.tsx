// Shown on every login-required page while auth status itself is still
// resolving (useAuth().status === "loading") — a small inline spinner right
// under that page's (already left-aligned) title, deliberately not shaped
// like the eventual authenticated layout. A page's own content-shaped
// skeleton (e.g. SettingsFormSkeleton, RequestLogBody's loading branch)
// only appears once we already know the viewer is authenticated and are
// just waiting on that page's own data — this component covers the earlier
// "don't know yet" gap, so a guest never sees a full page of
// member-only-shaped placeholders before the login prompt. A large
// center-floated circle here (an earlier version of this component) sat
// oddly under the page's left-aligned title with a big empty gap between
// them — this stays in the same left-aligned text flow instead.
export function AuthCheckingSpinner() {
  return (
    <div
      className="flex items-center gap-2 text-muted"
      data-testid="auth-checking-spinner"
    >
      <div
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-foreground"
      />
      <p className="text-sm">불러오는 중…</p>
    </div>
  );
}
