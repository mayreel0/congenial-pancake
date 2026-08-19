import type { ReadFeedItem } from "../../today/prototype/model";
import { ReadReplyBubble } from "./ReadReplyBubble";
import { ReadRequestBubble } from "./ReadRequestBubble";

type ReadThreadProps = {
  item: ReadFeedItem;
  authorLabels: Map<string, string>;
  savedReplyIds: Set<string>;
  onToggleSaveReply(replyId: string): void;
  onReportRequest(): void;
  onReportReply(replyId: string): void;
};

export function ReadThread({
  item,
  authorLabels,
  savedReplyIds,
  onToggleSaveReply,
  onReportRequest,
  onReportReply,
}: ReadThreadProps) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2">
        <ReadRequestBubble
          authorLabel={authorLabels.get(item.request.authorId) ?? "익명"}
          request={item.request}
          onReport={onReportRequest}
        />
        {item.replies.map((reply) => (
          <ReadReplyBubble
            authorLabel={authorLabels.get(reply.authorId) ?? "익명"}
            key={reply.id}
            reply={reply}
            saved={savedReplyIds.has(reply.id)}
            onReport={() => onReportReply(reply.id)}
            onToggleSave={() => onToggleSaveReply(reply.id)}
          />
        ))}
      </div>
    </section>
  );
}
