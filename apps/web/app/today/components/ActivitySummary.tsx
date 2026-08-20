type ActivitySummaryProps = {
  requestCount: number;
  replyCount: number;
  waitingCount: number;
};

export function ActivitySummary({
  requestCount,
  replyCount,
  waitingCount,
}: ActivitySummaryProps) {
  return (
    <section className="border-b border-line bg-surface px-5 py-4 sm:px-8">
      <p className="mx-auto max-w-3xl text-sm leading-6 text-muted">
        지금 볼 수 있는 위로 요청은 {requestCount}개, 답변은 {replyCount}개입니다.
        아직 답변을 기다리는 요청 {waitingCount}개를 먼저 보여줍니다.
      </p>
    </section>
  );
}
