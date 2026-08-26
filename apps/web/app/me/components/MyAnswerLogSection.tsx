import Link from "next/link";
import { useMyAnswerLogQuery } from "../../lib/replies/queries";
import { AnswerLogCard } from "./AnswerLogCard";

export function MyAnswerLogSection() {
  const answerLog = useMyAnswerLogQuery();
  const entries = answerLog.data ?? [];

  return (
    <section className="space-y-4" aria-labelledby="my-answer-log-heading">
      <div className="space-y-1">
        <h2
          className="text-lg font-semibold tracking-normal"
          id="my-answer-log-heading"
        >
          내가 남긴 답변
        </h2>
        <p className="text-sm text-muted">
          내가 어떤 온설에 어떤 답을 남겼는지 모아봤어요.
        </p>
      </div>
      {answerLog.isPending || answerLog.isLoading ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
          답변 기록을 불러오는 중입니다.
        </p>
      ) : entries.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
          <p className="text-sm text-muted">아직 남긴 답변이 없습니다.</p>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            href="/answer"
          >
            답변 남기러 가기
          </Link>
        </div>
      ) : (
        <ol className="space-y-4">
          {entries.map((entry) => (
            <AnswerLogCard entry={entry} key={entry.replyId} />
          ))}
        </ol>
      )}
    </section>
  );
}
