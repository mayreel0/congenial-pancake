import { Skeleton } from "ui/Skeleton";

// Shown on every login-required page while auth status itself is still
// resolving (useAuth().status === "loading") — deliberately generic, not a
// stand-in for that page's eventual authenticated layout. A page's own
// content-shaped skeleton (e.g. SettingsFormSkeleton, RequestLogBody's
// loading branch) only appears once we already know the viewer is
// authenticated and are just waiting on that page's own data — this
// component covers the earlier "don't know yet" gap, so a guest never sees
// a full page of member-only-shaped placeholders before the login prompt.
export function AuthCheckingSkeleton() {
  return (
    <div className="space-y-3" data-testid="auth-checking-skeleton">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}
