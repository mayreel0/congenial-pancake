import type { OnseolRequest, OnseolReply } from "../../today/prototype/types";
import { RequestBubble } from "./RequestBubble";
import { ReplyBubble } from "./ReplyBubble";

type AnswerLogProps = {
  entries: Array<{ request: OnseolRequest; reply: OnseolReply }>;
  currentRequest: OnseolRequest | null;
  authorLabels: Map<string, string>;
  onReport(requestId: string): void;
  onSkip(requestId: string): void;
  onHold(requestId: string): void;
};

export function AnswerLog({
  entries,
  currentRequest,
  authorLabels,
  onReport,
  onSkip,
  onHold,
}: AnswerLogProps) {
  return (
    <div
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-8"
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
      {currentRequest ? (
        <RequestBubble
          authorLabel={authorLabels.get(currentRequest.authorId) ?? "익명"}
          request={currentRequest}
          showActions
          onHold={() => onHold(currentRequest.id)}
          onReport={() => onReport(currentRequest.id)}
          onSkip={() => onSkip(currentRequest.id)}
        />
      ) : (
        <p className="text-sm text-muted">지금은 답할 수 있는 온설이 없어요.</p>
      )}
    </div>
  );
}
