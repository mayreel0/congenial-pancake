import type { OnseolReply } from "../prototype/types";
import { ReportButton } from "./ReportButton";

type ReplyCardProps = {
  reply: OnseolReply;
  mine: boolean;
  onReport(): void;
};

export function ReplyCard({ reply, mine, onReport }: ReplyCardProps) {
  return (
    <article className="rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-sm leading-6 text-foreground">{reply.body}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          {mine ? "내가 남긴 답변" : "누군가의 답변"}
        </span>
        <ReportButton
          ariaLabel="답변 신고"
          label="신고"
          onReport={onReport}
        />
      </div>
    </article>
  );
}
