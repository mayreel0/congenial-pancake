"use client";

import Link from "next/link";
import { MoreMenu } from "ui/MoreMenu";
import { formatTimestamp } from "../../lib/format";
import { BookmarkIcon, FlagIcon } from "../../components/shared/icons";

type ReadReplyBubbleProps = {
  reply: { id: string; body: string; createdAt: string };
  authorLabel: string;
  authorHref?: string | null;
  saved: boolean;
  showActions: boolean;
  // Public-profile thread detail (/u/[slug]/replies/[id]) rings the one
  // reply the viewer navigated to, so it stands out among the rest of the
  // thread — unused (always false) on /read, which has no single "this
  // one" reply to call out.
  highlighted?: boolean;
  onReport(): void;
  onToggleSave(): void;
};

export function ReadReplyBubble({
  reply,
  authorLabel,
  authorHref = null,
  saved,
  showActions,
  highlighted = false,
  onReport,
  onToggleSave,
}: ReadReplyBubbleProps) {
  return (
    <div className="flex items-end justify-end gap-2">
      {showActions && (
        <button
          aria-label={saved ? "마음에 남긴 답변, 눌러서 지우기" : "마음에 남기기"}
          aria-pressed={saved}
          className="mb-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface-muted hover:text-foreground"
          type="button"
          onClick={onToggleSave}
        >
          <BookmarkIcon className="h-4 w-4" filled={saved} />
        </button>
      )}
      <article
        className={`max-w-[85%] space-y-1.5 rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%] ${
          highlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
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
            <p className="text-xs font-semibold text-foreground">
              {authorLabel}
            </p>
          )}
          {showActions && (
            <MoreMenu
              ariaLabel="답변 도구"
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
        <p className="text-sm leading-6 text-foreground">{reply.body}</p>
        <time
          className="block text-xs text-muted"
          dateTime={reply.createdAt}
          suppressHydrationWarning
        >
          {formatTimestamp(reply.createdAt)}
        </time>
      </article>
    </div>
  );
}
