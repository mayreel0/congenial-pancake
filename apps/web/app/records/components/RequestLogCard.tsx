import Link from "next/link";
import { authorDisplayLabel, authorProfileHref } from "../../lib/author-label";
import { formatTimestamp } from "../../lib/format";
import type { MyRequestLogEntryDto } from "../../lib/requests/api";

export function RequestLogCard({ entry }: { entry: MyRequestLogEntryDto }) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 shadow-sm sm:px-5">
      <article className="max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
        <p className="text-xs font-semibold text-muted">내 고민</p>
        <p className="text-sm leading-6 text-foreground">{entry.request.body}</p>
        <time
          className="block text-xs text-muted"
          dateTime={entry.request.createdAt}
          suppressHydrationWarning
        >
          {formatTimestamp(entry.request.createdAt)}
        </time>
      </article>
      {entry.replies.length === 0 ? (
        <p className="text-xs text-muted">아직 받은 답변이 없어요.</p>
      ) : (
        <ol className="space-y-2">
          {entry.replies.map((reply) => (
            <li className="flex justify-end" key={reply.id}>
              <article className="max-w-[85%] space-y-1.5 rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
                {authorProfileHref(reply.author) ? (
                  <Link
                    className="text-xs font-semibold text-muted hover:underline"
                    href={authorProfileHref(reply.author)!}
                  >
                    {authorDisplayLabel(reply.author, "익명")}
                  </Link>
                ) : (
                  <p className="text-xs font-semibold text-muted">
                    {authorDisplayLabel(reply.author, "익명")}
                  </p>
                )}
                <p className="text-sm leading-6 text-foreground">{reply.body}</p>
                <time
                  className="block text-xs text-muted"
                  dateTime={reply.createdAt}
                  suppressHydrationWarning
                >
                  {formatTimestamp(reply.createdAt)}
                </time>
              </article>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
