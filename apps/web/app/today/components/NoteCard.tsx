import { truncatePreview } from "../prototype/model";
import type { OnseolRequest } from "../prototype/types";
import { ReportButton } from "./ReportButton";

type NoteCardProps = {
  request: OnseolRequest;
  replyCount: number;
  active: boolean;
  mine: boolean;
  onSelect(): void;
  onReport(): void;
};

export function NoteCard({
  request,
  replyCount,
  active,
  mine,
  onSelect,
  onReport,
}: NoteCardProps) {
  return (
    <article
      className={[
        "rounded-lg border bg-surface transition",
        active ? "border-primary shadow-sm" : "border-line",
      ].join(" ")}
    >
      <button
        className="block w-full px-4 py-4 text-left"
        type="button"
        onClick={onSelect}
      >
        <p className="text-sm leading-6 text-foreground">
          {truncatePreview(request.body, 92)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{replyCount === 0 ? "아직 답변 없음" : `답변 ${replyCount}개`}</span>
          {mine ? <span>내가 남긴 요청</span> : null}
        </div>
      </button>
      <div className="border-t border-line px-2 py-1">
        <ReportButton label="신고" onReport={onReport} />
      </div>
    </article>
  );
}
