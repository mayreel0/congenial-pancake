// Shown on every login-required page while auth status itself is still
// resolving (useAuth().status === "loading") — a plain centered spinner,
// deliberately not shaped like that page's eventual authenticated layout.
// A page's own content-shaped skeleton (e.g. SettingsFormSkeleton,
// RequestLogBody's loading branch) only appears once we already know the
// viewer is authenticated and are just waiting on that page's own data —
// this component covers the earlier "don't know yet" gap, so a guest never
// sees a full page of member-only-shaped placeholders before the login
// prompt. A row of skeleton bars here (an earlier version of this
// component) read as clutter for something this brief — a plain spinner
// says "checking" without implying any particular shape is coming.
export function AuthCheckingSpinner() {
  return (
    <div className="flex justify-center py-12" data-testid="auth-checking-spinner">
      <div
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-foreground"
      />
    </div>
  );
}
