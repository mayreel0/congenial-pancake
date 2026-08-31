"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatTimestamp } from "../../lib/format";
import { ArchiveIcon, FlagIcon, MoreIcon } from "../../components/shared/icons";

type RequestBubbleProps = {
  request: { id: string; body: string; createdAt: string };
  authorLabel: string;
  authorHref?: string | null;
  showActions: boolean;
  leaving?: boolean;
  onReport?(): void;
  onHold?(): void;
};

const iconButtonClassName =
  "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground";

export function RequestBubble({
  request,
  authorLabel,
  authorHref = null,
  showActions,
  leaving = false,
  onReport,
  onHold,
}: RequestBubbleProps) {
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
          <div className="relative shrink-0" ref={menuContainerRef}>
            <button
              aria-expanded={menuOpen}
              aria-label="더보기"
              className={iconButtonClassName}
              title="더보기"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreIcon className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                aria-label="답하기 도구"
                className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-surface-muted"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onHold?.();
                  }}
                >
                  <ArchiveIcon className="h-4 w-4" />
                  보류하기
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-surface-muted"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onReport?.();
                  }}
                >
                  <FlagIcon className="h-4 w-4" />
                  신고하기
                </button>
              </div>
            )}
          </div>
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
