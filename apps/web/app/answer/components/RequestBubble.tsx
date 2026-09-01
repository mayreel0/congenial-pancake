"use client";

import Link from "next/link";
import { MoreMenu } from "ui/MoreMenu";
import { formatTimestamp } from "../../lib/format";
import { ArchiveIcon, FlagIcon } from "../../components/shared/icons";

type RequestBubbleProps = {
  request: { id: string; body: string; createdAt: string };
  authorLabel: string;
  authorHref?: string | null;
  showActions: boolean;
  leaving?: boolean;
  onReport?(): void;
  onHold?(): void;
};

export function RequestBubble({
  request,
  authorLabel,
  authorHref = null,
  showActions,
  leaving = false,
  onReport,
  onHold,
}: RequestBubbleProps) {
  return (
    <article
      className={[
        "max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]",
        leaving ? "onseol-bubble-leave" : "onseol-bubble-enter",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        {authorHref ? (
          <Link
            className="text-xs font-semibold text-foreground hover:underline"
            href={authorHref}
          >
            {authorLabel}
          </Link>
        ) : (
          <p className="text-xs font-semibold text-foreground">{authorLabel}</p>
        )}
        {showActions && (
          <MoreMenu
            ariaLabel="답하기 도구"
            items={[
              {
                key: "hold",
                icon: <ArchiveIcon className="h-4 w-4" />,
                label: "보류하기",
                onClick: () => onHold?.(),
              },
              {
                key: "report",
                icon: <FlagIcon className="h-4 w-4" />,
                label: "신고하기",
                onClick: () => onReport?.(),
              },
            ]}
          />
        )}
      </div>
      <p className="text-sm leading-6 text-foreground">{request.body}</p>
      <time
        className="block text-xs text-muted"
        dateTime={request.createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(request.createdAt)}
      </time>
    </article>
  );
}
