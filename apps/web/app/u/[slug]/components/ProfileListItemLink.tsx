import Link from "next/link";
import { formatTimestamp } from "../../../lib/format";

type ProfileListItemLinkProps = {
  href: string;
  eyebrow: string;
  body: string;
  createdAt: string;
};

// Same look as ProfilePostCard's <li> card, but the whole card is a <Link>
// to that post's detail thread — ProfilePostCard itself can't be reused
// here as-is since wrapping its <li> in a <Link> would put a non-<li>
// element directly under the parent <ol>.
export function ProfileListItemLink({
  href,
  eyebrow,
  body,
  createdAt,
}: ProfileListItemLinkProps) {
  return (
    <li>
      <Link
        className="block space-y-1.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-sm transition hover:border-primary/40 hover:bg-surface-muted"
        href={href}
      >
        <p className="text-xs font-semibold text-muted">{eyebrow}</p>
        <p className="text-sm leading-6 text-foreground">{body}</p>
        <time
          className="block text-xs text-muted"
          dateTime={createdAt}
          suppressHydrationWarning
        >
          {formatTimestamp(createdAt)}
        </time>
      </Link>
    </li>
  );
}
