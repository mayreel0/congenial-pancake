import Link from "next/link";
import { MoreMenu } from "ui/MoreMenu";
import { TrashIcon } from "../components/shared/icons";
import { formatTimestamp } from "../lib/format";

type NotificationListItemProps = {
  id: string;
  // Absent for a notification with nothing to link to (e.g. an admin test
  // push, which has no real request/reply behind it) — renders as a plain
  // (non-link) block instead of Link's <a>.
  href?: string;
  eyebrow: string;
  body: string;
  createdAt: string;
  onDelete(id: string): void;
};

// Not ProfileListItemLink — that component wraps its entire card in a
// single <Link>, which leaves no room for a per-item delete action (a
// <button> can't nest inside the <a> it renders as). This is notification-
// specific anyway (only caller that needs a delete action per item), so it
// gets its own component rather than complicating the shared one for a
// single consumer.
export function NotificationListItem({
  id,
  href,
  eyebrow,
  body,
  createdAt,
  onDelete,
}: NotificationListItemProps) {
  const content = (
    <>
      <p className="text-xs font-semibold text-muted">{eyebrow}</p>
      <p className="whitespace-pre-line text-sm leading-6 text-foreground">
        {body}
      </p>
      <time
        className="block text-xs text-muted"
        dateTime={createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(createdAt)}
      </time>
    </>
  );

  return (
    <li className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm transition hover:border-primary/40 hover:bg-surface-muted">
      <div className="flex items-start justify-between gap-2">
        {href ? (
          <Link className="min-w-0 flex-1 space-y-1.5" href={href}>
            {content}
          </Link>
        ) : (
          <div className="min-w-0 flex-1 space-y-1.5">{content}</div>
        )}
        <MoreMenu
          ariaLabel="알림 도구"
          items={[
            {
              key: "delete",
              icon: <TrashIcon className="h-4 w-4" />,
              label: "삭제하기",
              onClick: () => onDelete(id),
            },
          ]}
        />
      </div>
    </li>
  );
}
