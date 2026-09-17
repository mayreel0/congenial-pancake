import Link from "next/link";
import { MoreMenu } from "ui/MoreMenu";
import { TrashIcon } from "../components/shared/icons";
import { formatTimestamp } from "../lib/format";

type NotificationListItemProps = {
  id: string;
  href: string;
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
  return (
    <li className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm transition hover:border-primary/40 hover:bg-surface-muted">
      <div className="flex items-start justify-between gap-2">
        <Link className="min-w-0 flex-1 space-y-1.5" href={href}>
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
        </Link>
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
