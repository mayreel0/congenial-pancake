import { truncatePreview } from "../prototype/model";
import type { OnseolReply, OnseolRequest } from "../prototype/types";

type RecentExchangeListProps = {
  exchanges: Array<{ request: OnseolRequest; reply: OnseolReply | null }>;
};

export function RecentExchangeList({ exchanges }: RecentExchangeListProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">최근 온설</h2>
      {exchanges.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-4 text-sm text-muted">
          아직 보여줄 대화가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {exchanges.map(({ request, reply }) => (
            <article
              className="rounded-lg border border-line bg-surface px-4 py-4"
              key={request.id}
            >
              <p className="text-sm leading-6 text-foreground">
                {truncatePreview(request.body, 74)}
              </p>
              <p className="mt-3 border-l-2 border-primary pl-3 text-sm leading-6 text-muted">
                {reply
                  ? truncatePreview(reply.body, 84)
                  : "아직 답변을 기다리고 있습니다."}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
