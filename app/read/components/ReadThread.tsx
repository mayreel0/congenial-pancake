import type { ReadFeedItem } from "../../today/prototype/model";
import { ReadReplyBubble } from "./ReadReplyBubble";
import { ReadRequestBubble } from "./ReadRequestBubble";
import { SaveToggleButton } from "./SaveToggleButton";

type ReadThreadProps = {
  item: ReadFeedItem;
  authorLabels: Map<string, string>;
  saved: boolean;
  onToggleSave(): void;
  onReportRequest(): void;
  onReportReply(replyId: string): void;
};

export function ReadThread({
  item,
  authorLabels,
  saved,
  onToggleSave,
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
            onReport={() => onReportReply(reply.id)}
          />
        ))}
      </div>
      <SaveToggleButton saved={saved} onToggle={onToggleSave} />
    </section>
  );
}
