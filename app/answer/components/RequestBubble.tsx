import type { OnseolRequest } from "../../today/prototype/types";
import { ReportButton } from "../../today/components/ReportButton";
import { formatTimestamp } from "../prototype/format";

type RequestBubbleProps = {
  request: OnseolRequest;
  authorLabel: string;
  showActions: boolean;
  onReport?(): void;
  onSkip?(): void;
  onHold?(): void;
};

export function RequestBubble({
  request,
  authorLabel,
  showActions,
  onReport,
  onSkip,
  onHold,
}: RequestBubbleProps) {
  return (
    <article className="max-w-[85%] space-y-1 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="font-semibold text-foreground">{authorLabel}</span>
        <time dateTime={request.createdAt}>
          {formatTimestamp(request.createdAt)}
        </time>
      </div>
      <p className="text-sm leading-6 text-foreground">{request.body}</p>
      {showActions ? (
        <div className="flex items-center gap-1 pt-1">
          <ReportButton label="신고" onReport={() => onReport?.()} />
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={() => onSkip?.()}
          >
            스킵
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={() => onHold?.()}
          >
            보류
          </button>
        </div>
      ) : null}
    </article>
  );
}
