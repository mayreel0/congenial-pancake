import { truncatePreview } from "../prototype/model";
import type { OnseolReply, OnseolRequest } from "../prototype/types";

type MyActivityListProps = {
  requests: OnseolRequest[];
  replies: OnseolReply[];
};

export function MyActivityList({ requests, replies }: MyActivityListProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">내 정보</h2>
      <div className="rounded-lg border border-line bg-surface px-4 py-4">
        <p className="text-sm font-medium text-foreground">내가 쓴 요청</p>
        <div className="mt-3 space-y-2">
          {requests.length === 0 ? (
            <p className="text-sm text-muted">아직 남긴 요청이 없습니다.</p>
          ) : (
            requests.map((request) => (
              <p className="text-sm leading-6 text-muted" key={request.id}>
                {truncatePreview(request.body, 72)}
              </p>
            ))
          )}
        </div>
      </div>
      <div className="rounded-lg border border-line bg-surface px-4 py-4">
        <p className="text-sm font-medium text-foreground">내가 남긴 답변</p>
        <div className="mt-3 space-y-2">
          {replies.length === 0 ? (
            <p className="text-sm text-muted">아직 남긴 답변이 없습니다.</p>
          ) : (
            replies.map((reply) => (
              <p className="text-sm leading-6 text-muted" key={reply.id}>
                {truncatePreview(reply.body, 72)}
              </p>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
