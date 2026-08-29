import { formatTimestamp } from "../../../lib/format";

type ProfilePostCardProps = {
  eyebrow: string;
  body: string;
  createdAt: string;
};

export function ProfilePostCard({ eyebrow, body, createdAt }: ProfilePostCardProps) {
  return (
    <li className="space-y-1.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold text-muted">{eyebrow}</p>
      <p className="text-sm leading-6 text-foreground">{body}</p>
      <time
        className="block text-xs text-muted"
        dateTime={createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(createdAt)}
      </time>
    </li>
  );
}
