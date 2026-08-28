import type { ReactNode } from "react";
import type { AnswerLogEntry } from "../useAnswerQueue";
import type { RequestDto } from "../../lib/requests/api";
import { authorDisplayLabel } from "../../lib/author-label";
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
  canManageCurrentRequest,
  onReport,
  onSkip,
  onHold,
}: AnswerLogProps) {
  const lastEntryReply = entries[entries.length - 1]?.reply ?? null;
  const showLiveDivider =
    !lastEntryReply ||
    !isSameCalendarDay(lastEntryReply.createdAt, new Date().toISOString());

  const blocks: ReactNode[] = entries.map(({ request, reply }, index) => {
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
  });

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
    >
      {blocks.slice().reverse()}
    </div>
  );
}
