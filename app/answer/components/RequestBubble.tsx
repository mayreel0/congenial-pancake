import type { OnseolRequest } from "../../today/prototype/types";
import { ReportButton } from "../../today/components/ReportButton";
import { formatTimestamp } from "../prototype/format";

type RequestBubbleProps = {
  request: OnseolRequest;
  authorLabel: string;
  showActions: boolean;
  leaving?: boolean;
  onReport?(): void;
  onSkip?(): void;
  onHold?(): void;
};

export function RequestBubble({
  request,
  authorLabel,
  showActions,
  leaving = false,
  onReport,
  onSkip,
  onHold,
}: RequestBubbleProps) {
  return (
    <article
      className={[
        "max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]",
        leaving ? "onseol-bubble-leave" : "onseol-bubble-enter",
      ].join(" ")}
    >
      <p className="text-xs font-semibold text-foreground">{authorLabel}</p>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-6 text-foreground">
          {request.body}
        </p>
        {showActions ? (
          <div className="flex shrink-0 items-center gap-1">
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
      </div>
      <time
        className="block text-xs text-muted"
        dateTime={request.createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(request.createdAt)}
      </time>
    </article>
  );
}
