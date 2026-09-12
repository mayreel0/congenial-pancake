import { MoreMenu } from "ui/MoreMenu";
import { AuthorLabel } from "../../components/shared/AuthorLabel";
import { TrashIcon } from "../../components/shared/icons";
import { authorDisplayLabel, authorProfileHref } from "../../lib/author-label";
import { formatTimestamp } from "../../lib/format";
import type { MyRequestLogEntryDto } from "../../lib/requests/api";

type RequestLogCardProps = {
  entry: MyRequestLogEntryDto;
  onDeleteRequest(requestId: string): void;
};

export function RequestLogCard({ entry, onDeleteRequest }: RequestLogCardProps) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 shadow-sm sm:px-5">
      <article className="max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted">내 고민</p>
          {!entry.request.removed && (
            <MoreMenu
              ariaLabel="내 고민 도구"
              items={[
                {
                  key: "delete",
                  icon: <TrashIcon className="h-4 w-4" />,
                  label: "삭제하기",
                  onClick: () => onDeleteRequest(entry.request.id),
                },
              ]}
            />
          )}
        </div>
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
                <AuthorLabel
                  href={authorProfileHref(reply.author)}
                  label={authorDisplayLabel(reply.author, "익명")}
                />
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
