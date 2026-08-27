import { Button } from "ui/Button";
import type { MyAnswerLogEntryDto } from "../../lib/replies/api";
import { useMyAnswerLogQuery } from "../../lib/replies/queries";
import { AnswerLogCard } from "./AnswerLogCard";

type AnswerLogBodyProps = {
  loading: boolean;
  entries: MyAnswerLogEntryDto[];
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function AnswerLogBody({ loading, entries }: AnswerLogBodyProps) {
  if (loading) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
        답변 기록을 불러오는 중입니다.
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
        <p className="text-sm text-muted">아직 남긴 답변이 없습니다.</p>
        <Button href="/answer" size="sm">
          답변 남기러 가기
        </Button>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <AnswerLogCard entry={entry} key={entry.replyId} />
      ))}
    </ol>
  );
}

export function MyAnswerLogSection() {
  const answerLog = useMyAnswerLogQuery();

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
      <AnswerLogBody
        entries={answerLog.data ?? []}
        loading={answerLog.isPending || answerLog.isLoading}
      />
    </section>
  );
}
