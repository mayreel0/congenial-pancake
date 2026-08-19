import type { OnseolReply } from "../../today/prototype/types";
import { formatTimestamp } from "../prototype/format";
import { FlagIcon } from "./icons";
import { SaveToggleButton } from "./SaveToggleButton";

type ReadReplyBubbleProps = {
  reply: OnseolReply;
  authorLabel: string;
  saved: boolean;
  onReport(): void;
  onToggleSave(): void;
};

export function ReadReplyBubble({
  reply,
  authorLabel,
  saved,
  onReport,
  onToggleSave,
}: ReadReplyBubbleProps) {
  return (
    <article className="max-w-[85%] space-y-1.5 self-end rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{authorLabel}</p>
        <button
          aria-label="이 답변 신고하기"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-foreground"
          type="button"
          onClick={onReport}
        >
          <FlagIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm leading-6 text-foreground">{reply.body}</p>
      <div className="flex items-center justify-between gap-3">
        <time
          className="text-xs text-muted"
          dateTime={reply.createdAt}
          suppressHydrationWarning
        >
          {formatTimestamp(reply.createdAt)}
        </time>
        <SaveToggleButton saved={saved} onToggle={onToggleSave} />
      </div>
    </article>
  );
}
