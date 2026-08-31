import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { AnswerLogEntry } from "../useAnswerQueue";
import type { RequestDto } from "../../lib/requests/api";
import { authorDisplayLabel, authorProfileHref } from "../../lib/author-label";
import { formatDayLabel, isSameCalendarDay } from "../../lib/format";
import { DateDivider } from "./DateDivider";
import { RequestBubble } from "./RequestBubble";
import { ReplyBubble } from "./ReplyBubble";
import { SkipIcon } from "../../components/shared/icons";
import { TypingBubble } from "./TypingBubble";

type AnswerLogProps = {
  entries: AnswerLogEntry[];
  currentRequest: RequestDto | null;
  authorLabels: Map<string, string>;
  leavingRequestId: string | null;
  loadingNext: boolean;
  isTyping: boolean;
  // Reverse-infinite-scroll: scrolling up toward the oldest loaded entry
  // loads further into the past. hasOlderEntries false means the very
  // first reply this viewer ever gave has already been loaded.
  hasOlderEntries: boolean;
  isLoadingOlderEntries: boolean;
  onLoadOlderEntries(): void;
  // Hold/report are login-only (see docs/decisions/2026-08-22-onseol-answer-
  // queue-decisions.md) — the "더보기" menu is hidden entirely for guests
  // rather than showing actions that would just 401.
  canManageCurrentRequest: boolean;
  onReport(requestId: string): void;
  onSkip(requestId: string): void;
  onHold(requestId: string): void;
};

export function AnswerLog({
  entries,
  currentRequest,
  authorLabels,
  leavingRequestId,
  loadingNext,
  isTyping,
  hasOlderEntries,
  isLoadingOlderEntries,
  onLoadOlderEntries,
  canManageCurrentRequest,
  onReport,
  onSkip,
  onHold,
}: AnswerLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Prepending older entries above the current scroll position would
  // otherwise make the view jump — captured right as loading starts, then
  // used once it finishes to shift scrollTop by exactly the height added.
  const scrollHeightBeforeLoadRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (isLoadingOlderEntries) {
      scrollHeightBeforeLoadRef.current = containerRef.current?.scrollHeight ?? null;
      return;
    }
    const container = containerRef.current;
    const previousHeight = scrollHeightBeforeLoadRef.current;
    if (!container || previousHeight === null) return;
    container.scrollTop += container.scrollHeight - previousHeight;
    scrollHeightBeforeLoadRef.current = null;
  }, [isLoadingOlderEntries, entries.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !hasOlderEntries) return;

    const observer = new IntersectionObserver(
      ([sentinelEntry]) => {
        if (sentinelEntry.isIntersecting) onLoadOlderEntries();
      },
      { root: container, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlderEntries, onLoadOlderEntries]);
  const lastEntryReply = entries[entries.length - 1]?.reply ?? null;
  const showLiveDivider =
    !lastEntryReply ||
    !isSameCalendarDay(lastEntryReply.createdAt, new Date().toISOString());

  const blocks: ReactNode[] = [];

  // Oldest position — with the container's flex-col-reverse + the
  // .reverse() below, this ends up at the visual top, which is exactly
  // where "scroll up for older" needs the trigger to sit.
  if (hasOlderEntries) {
    blocks.push(
      <div className="flex justify-center py-3" key="load-older" ref={sentinelRef}>
        {isLoadingOlderEntries ? (
          <p aria-live="polite" className="text-xs text-muted">
            이전 대화 불러오는 중…
          </p>
        ) : null}
      </div>,
    );
  }

  blocks.push(
    ...entries.map(({ request, reply }, index) => {
    const previousReply = entries[index - 1]?.reply ?? null;
    const showDivider =
      !previousReply ||
      !isSameCalendarDay(previousReply.createdAt, reply.createdAt);

    return (
      <div className="flex flex-col gap-2" key={reply.id}>
        {showDivider ? (
          <DateDivider label={formatDayLabel(reply.createdAt)} />
        ) : null}
        <RequestBubble
          authorHref={authorProfileHref(request.author)}
          authorLabel={authorDisplayLabel(
            request.author,
            authorLabels.get(request.id) ?? "익명",
          )}
          request={request}
          showActions={false}
        />
        <ReplyBubble reply={reply} />
      </div>
    );
  }),
  );

  if (loadingNext) {
    blocks.push(
      <div className="flex flex-col gap-2" key="live-loading">
        {showLiveDivider ? <DateDivider label="오늘" /> : null}
        <div
          aria-live="polite"
          className="onseol-bubble-enter max-w-[85%] animate-pulse self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]"
        >
          <p className="text-xs text-muted">다음 글 불러오는 중…</p>
        </div>
      </div>,
    );
  } else if (currentRequest) {
    blocks.push(
      <div className="flex flex-col gap-2" key="live-current">
        {showLiveDivider ? <DateDivider label="오늘" /> : null}
        <RequestBubble
          authorHref={authorProfileHref(currentRequest.author)}
          authorLabel={authorDisplayLabel(
            currentRequest.author,
            authorLabels.get(currentRequest.id) ?? "익명",
          )}
          leaving={currentRequest.id === leavingRequestId}
          request={currentRequest}
          showActions={canManageCurrentRequest}
          onHold={() => onHold(currentRequest.id)}
          onReport={() => onReport(currentRequest.id)}
        />
        {isTyping ? <TypingBubble /> : null}
        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-sm transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={() => onSkip(currentRequest.id)}
          >
            다음 글
            <SkipIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>,
    );
  } else {
    blocks.push(
      <p className="text-sm text-muted" key="live-empty">
        지금은 답할 수 있는 온설이 없어요.
      </p>,
    );
  }

  return (
    <div
      className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col-reverse gap-4 overflow-y-auto px-5 py-6 sm:px-8"
      data-testid="answer-log"
      ref={containerRef}
    >
      {blocks.slice().reverse()}
    </div>
  );
}
