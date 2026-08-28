import type { FeedItemDto } from "../../lib/requests/api";
import { authorDisplayLabel } from "../../lib/author-label";
import { ReadReplyBubble } from "./ReadReplyBubble";
import { ReadRequestBubble } from "./ReadRequestBubble";

type ReadThreadProps = {
  item: FeedItemDto;
  authorLabels: Map<number, string>;
  savedReplyIds: Set<string>;
  showActions: boolean;
  onToggleSaveReply(replyId: string): void;
  onReportRequest(): void;
  onReportReply(replyId: string): void;
};

export function ReadThread({
  item,
  authorLabels,
  savedReplyIds,
  showActions,
  onToggleSaveReply,
  onReportRequest,
  onReportReply,
}: ReadThreadProps) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2">
        <ReadRequestBubble
          authorLabel={authorDisplayLabel(
            item.request.author,
            authorLabels.get(item.request.authorSlot) ?? "익명",
          )}
          request={item.request}
          showActions={showActions}
          onReport={onReportRequest}
        />
        {item.replies.map((reply) => (
          <ReadReplyBubble
            authorLabel={authorDisplayLabel(
              reply.author,
              authorLabels.get(reply.authorSlot) ?? "익명",
            )}
            key={reply.id}
            reply={reply}
            saved={savedReplyIds.has(reply.id)}
            showActions={showActions}
            onReport={() => onReportReply(reply.id)}
            onToggleSave={() => onToggleSaveReply(reply.id)}
          />
        ))}
      </div>
    </section>
  );
}
