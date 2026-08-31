"use client";

import Link from "next/link";
import { MoreMenu } from "ui/MoreMenu";
import { formatTimestamp } from "../../lib/format";
import { FlagIcon } from "../../components/shared/icons";

type ReadRequestBubbleProps = {
  request: { id: string; body: string; createdAt: string };
  authorLabel: string;
  authorHref?: string | null;
  showActions: boolean;
  onReport(): void;
};

export function ReadRequestBubble({
  request,
  authorLabel,
  authorHref = null,
  showActions,
  onReport,
}: ReadRequestBubbleProps) {
  return (
    <article className="max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
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
            ariaLabel="온설 도구"
            items={[
              {
                key: "report",
                icon: <FlagIcon className="h-4 w-4" />,
                label: "신고하기",
                onClick: onReport,
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
