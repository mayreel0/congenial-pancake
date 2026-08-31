import type { FeedItemDto } from "../../lib/requests/api";
import { authorDisplayLabel, authorProfileHref } from "../../lib/author-label";
import { ReadReplyBubble } from "./ReadReplyBubble";
import { ReadRequestBubble } from "./ReadRequestBubble";

type ReadThreadProps = {
  item: FeedItemDto;
  authorLabels: Map<number, string>;
  savedReplyIds: Set<string>;
  showActions: boolean;
  // Public-profile 답변 상세 (/u/[slug]/replies/[id]) passes the replyId it
  // navigated from so that one bubble stands out in the full thread; /read
  // never sets this.
  highlightReplyId?: string;
  onToggleSaveReply(replyId: string): void;
  onReportRequest(): void;
  onReportReply(replyId: string): void;
};

export function ReadThread({
  item,
  authorLabels,
  savedReplyIds,
  showActions,
  highlightReplyId,
  onToggleSaveReply,
  onReportRequest,
  onReportReply,
}: ReadThreadProps) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2">
        <ReadRequestBubble
          authorHref={authorProfileHref(item.request.author)}
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
            authorHref={authorProfileHref(reply.author)}
            authorLabel={authorDisplayLabel(
              reply.author,
              authorLabels.get(reply.authorSlot) ?? "익명",
            )}
            highlighted={reply.id === highlightReplyId}
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
