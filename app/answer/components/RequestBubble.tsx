import type { OnseolRequest } from "../../today/prototype/types";
import { formatTimestamp } from "../prototype/format";
import { ArchiveIcon, FlagIcon } from "./icons";

type RequestBubbleProps = {
  request: OnseolRequest;
  authorLabel: string;
  showActions: boolean;
  leaving?: boolean;
  onReport?(): void;
  onHold?(): void;
};

const iconButtonClassName =
  "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground";

export function RequestBubble({
  request,
  authorLabel,
  showActions,
  leaving = false,
  onReport,
  onHold,
}: RequestBubbleProps) {
  return (
    <article
      className={[
        "max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]",
        leaving ? "onseol-bubble-leave" : "onseol-bubble-enter",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{authorLabel}</p>
        {showActions ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              aria-label="신고"
              className={iconButtonClassName}
              title="신고"
              type="button"
              onClick={() => onReport?.()}
            >
              <FlagIcon className="h-4 w-4" />
            </button>
            <button
              aria-label="보류"
              className={iconButtonClassName}
              title="보류"
              type="button"
              onClick={() => onHold?.()}
            >
              <ArchiveIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-foreground">{request.body}</p>
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
