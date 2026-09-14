import { Skeleton } from "ui/Skeleton";

// Stand-in for SettingsForm's three cards while local device settings
// haven't been read from localStorage yet (deferred to a post-mount effect
// so the very first render always matches the server — see
// SettingsPageContent's own comment on that). Only shown once we already
// know the viewer is authenticated; AuthCheckingSkeleton covers the earlier
// "don't know yet" gap.
export function SettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((key) => (
        <div
          className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm"
          key={key}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-56 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
