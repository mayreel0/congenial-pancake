import { useEffect, useRef } from "react";
import type { OnseolRequest, OnseolReply } from "../../today/prototype/types";
import { formatDayLabel, isSameCalendarDay } from "../prototype/format";
import { DateDivider } from "./DateDivider";
import { RequestBubble } from "./RequestBubble";
import { ReplyBubble } from "./ReplyBubble";
import { SkipIcon } from "./icons";
import { TypingBubble } from "./TypingBubble";

type AnswerLogProps = {
  entries: Array<{ request: OnseolRequest; reply: OnseolReply }>;
  currentRequest: OnseolRequest | null;
  authorLabels: Map<string, string>;
  leavingRequestId: string | null;
  loadingNext: boolean;
  isTyping: boolean;
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
  onReport,
  onSkip,
  onHold,
}: AnswerLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries.length, currentRequest?.id, loadingNext, isTyping]);

  const lastEntryReply = entries[entries.length - 1]?.reply ?? null;
  const showLiveDivider =
    !lastEntryReply ||
    !isSameCalendarDay(lastEntryReply.createdAt, new Date().toISOString());

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end gap-4 overflow-y-auto px-5 py-6 sm:px-8"
      data-testid="answer-log"
      ref={scrollRef}
    >
      {entries.map(({ request, reply }, index) => {
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
              authorLabel={authorLabels.get(request.authorId) ?? "익명"}
              request={request}
              showActions={false}
            />
            <ReplyBubble reply={reply} />
          </div>
        );
      })}
      {loadingNext ? (
        <>
          {showLiveDivider ? <DateDivider label="오늘" /> : null}
          <div
            aria-live="polite"
            className="onseol-bubble-enter max-w-[85%] animate-pulse self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]"
          >
            <p className="text-xs text-muted">다음 글 불러오는 중…</p>
          </div>
        </>
      ) : currentRequest ? (
        <>
          {showLiveDivider ? <DateDivider label="오늘" /> : null}
          <RequestBubble
            authorLabel={authorLabels.get(currentRequest.authorId) ?? "익명"}
            leaving={currentRequest.id === leavingRequestId}
            request={currentRequest}
            showActions
            onHold={() => onHold(currentRequest.id)}
            onReport={() => onReport(currentRequest.id)}
          />
          {isTyping ? <TypingBubble /> : null}
          <div className="sticky bottom-1 z-10 flex justify-end">
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-sm transition hover:bg-surface-muted hover:text-foreground"
              type="button"
              onClick={() => onSkip(currentRequest.id)}
            >
              다음 글
              <SkipIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">지금은 답할 수 있는 온설이 없어요.</p>
      )}
    </div>
  );
}
