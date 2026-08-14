import type { ActivityStat } from "./landing-data";

type ActivityStatsProps = {
  stats: ActivityStat[];
};

export function ActivityStats({ stats }: ActivityStatsProps) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm"
          key={stat.label}
        >
          <dt className="text-sm text-muted">{stat.label}</dt>
          <dd className="mt-2 text-2xl font-semibold text-foreground">
            {stat.value}
          </dd>
          <p className="mt-1 text-xs text-muted">{stat.helper}</p>
        </div>
      ))}
    </dl>
  );
}
