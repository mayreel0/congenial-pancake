"use client";

import { useEffect, useRef, useState } from "react";
import type { OnseolReply } from "../../today/prototype/types";
import { formatTimestamp } from "../../lib/format";
import { BookmarkIcon, FlagIcon, MoreIcon } from "../../components/shared/icons";

type ReadReplyBubbleProps = {
  reply: OnseolReply;
  authorLabel: string;
  saved: boolean;
  onReport(): void;
  onToggleSave(): void;
};

export function ReadReplyBubble({
  reply,
  authorLabel,
  saved,
  onReport,
  onToggleSave,
}: ReadReplyBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="flex items-end justify-end gap-2">
      <button
        aria-label={saved ? "마음에 남긴 답변, 눌러서 지우기" : "마음에 남기기"}
        aria-pressed={saved}
        className="mb-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface-muted hover:text-foreground"
        type="button"
        onClick={onToggleSave}
      >
        <BookmarkIcon className="h-4 w-4" filled={saved} />
      </button>
      <article className="max-w-[85%] space-y-1.5 rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-foreground">
            {authorLabel}
          </p>
          <div className="relative shrink-0" ref={menuContainerRef}>
            <button
              aria-expanded={menuOpen}
              aria-label="더보기"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground"
              title="더보기"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreIcon className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div
                aria-label="답변 도구"
                className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-surface-muted"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onReport();
                  }}
                >
                  <FlagIcon className="h-4 w-4" />
                  신고하기
                </button>
              </div>
            ) : null}
          </div>
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
