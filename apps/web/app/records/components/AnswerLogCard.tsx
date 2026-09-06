import { formatTimestamp } from "../../lib/format";
import type { MyAnswerLogEntryDto } from "../../lib/replies/api";

export function AnswerLogCard({ entry }: { entry: MyAnswerLogEntryDto }) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 shadow-sm sm:px-5">
      <article className="max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
        <p className="text-xs font-semibold text-muted">온설</p>
        <p className="text-sm leading-6 text-foreground">{entry.requestBody}</p>
        <time
          className="block text-xs text-muted"
          dateTime={entry.requestCreatedAt}
          suppressHydrationWarning
        >
          {formatTimestamp(entry.requestCreatedAt)}
        </time>
      </article>
      <div className="flex justify-end">
        <article className="max-w-[85%] space-y-1.5 rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
          <p className="text-xs font-semibold text-muted">내 답변</p>
          <p className="text-sm leading-6 text-foreground">{entry.replyBody}</p>
          <time
            className="block text-xs text-muted"
            dateTime={entry.replyCreatedAt}
            suppressHydrationWarning
          >
            {formatTimestamp(entry.replyCreatedAt)}
          </time>
        </article>
      </div>
    </li>
  );
}
