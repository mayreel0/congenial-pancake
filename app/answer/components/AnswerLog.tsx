import type { OnseolRequest, OnseolReply } from "../../today/prototype/types";
import { RequestBubble } from "./RequestBubble";
import { ReplyBubble } from "./ReplyBubble";
import { SkipIcon } from "./icons";

type AnswerLogProps = {
  entries: Array<{ request: OnseolRequest; reply: OnseolReply }>;
  currentRequest: OnseolRequest | null;
  authorLabels: Map<string, string>;
  leavingRequestId: string | null;
  loadingNext: boolean;
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
  onReport,
  onSkip,
  onHold,
}: AnswerLogProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-8"
      data-testid="answer-log"
    >
      {entries.map(({ request, reply }) => (
        <div className="flex flex-col gap-2" key={reply.id}>
          <RequestBubble
            authorLabel={authorLabels.get(request.authorId) ?? "익명"}
            request={request}
            showActions={false}
          />
          <ReplyBubble reply={reply} />
        </div>
      ))}
      {loadingNext ? (
        <div
          aria-live="polite"
          className="onseol-bubble-enter max-w-[85%] animate-pulse self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]"
        >
          <p className="text-xs text-muted">다음 글 불러오는 중…</p>
        </div>
      ) : currentRequest ? (
        <>
          <RequestBubble
            authorLabel={authorLabels.get(currentRequest.authorId) ?? "익명"}
            leaving={currentRequest.id === leavingRequestId}
            request={currentRequest}
            showActions
            onHold={() => onHold(currentRequest.id)}
            onReport={() => onReport(currentRequest.id)}
          />
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
