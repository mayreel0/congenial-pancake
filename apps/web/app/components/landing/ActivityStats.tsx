"use client";

import { Skeleton } from "ui/Skeleton";
import { useLandingStatsQuery } from "../../lib/landing/queries";

// 원래 5개짜리 KPI 카드 그리드였는데, "온설의 나머지 UI는 감정적이고
// 조용한데 랜딩만 갑자기 SaaS 대시보드가 된다"는 지적(2026-09-14)에 따라
// /today의 "오늘 N개의 이야기가 남겨졌고..." 자연어 표현을 그대로 가져옴 —
// 숫자를 나열하기보다 "사람들이 실제로 여기 있다"는 느낌을 주는 쪽이 톤에
// 맞다고 판단. 오늘의 요청/답장 개수는 /today 자체가 이미 보여주므로 여기서는
// 누적 총합(첫인상에서 규모감을 주는 것)과 "답장을 기다리는 글"(방문자에게
// 답하러 갈 이유를 주는 것)만 남김.
export function ActivityStats() {
  const { data, isPending, isError } = useLandingStatsQuery();

  if (isError) return null;

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-80" />
        <Skeleton className="h-5 w-56" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-lg text-muted">
        지금까지 {data.requests.total}개의 이야기가 남겨졌고,{" "}
        {data.replies.total}개의 따뜻한 답장이 도착했어요.
      </p>
      {data.waitingForReply > 0 && (
        <p className="text-sm text-muted">
          지금 {data.waitingForReply}개의 이야기가 답장을 기다리고 있어요.
        </p>
      )}
    </div>
  );
}
