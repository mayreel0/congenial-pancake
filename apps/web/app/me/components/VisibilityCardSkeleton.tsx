import { Skeleton } from "ui/Skeleton";

type VisibilityCardSkeletonProps = {
  title: string;
  toggleCount: number;
};

// Stand-in for NicknameVisibilitySection/ProfileVisibilitySection while
// `user` isn't loaded yet — both need a real user to seed
// VisibilityDraftProvider's draft state, so this renders outside that
// provider entirely rather than teaching it to tolerate a null user. Keeps
// each card's real title visible (only the toggle rows need real data).
export function VisibilityCardSkeleton({
  title,
  toggleCount,
}: VisibilityCardSkeletonProps) {
  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3">
        {Array.from({ length: toggleCount }, (_, index) => (
          <Skeleton className="h-5 w-40" key={index} />
        ))}
      </div>
    </section>
  );
}
