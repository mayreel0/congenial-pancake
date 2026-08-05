"use client";

import { useState } from "react";
import ComfortReplyPanel from "@/components/ComfortReplyPanel";
import ComfortRequestForm from "@/components/ComfortRequestForm";
import RecentComfortExamples from "@/components/RecentComfortExamples";

type Props = {
  hasRequestedToday: boolean;
  isAuthenticated: boolean;
  recentExamples: Array<{ id: string; body: string; replies: Array<{ id: string; body: string }> }>;
  answerableRequests: Array<{ id: string; body: string; replyCount: number }>;
};

export default function ComfortMain({ hasRequestedToday, isAuthenticated, recentExamples, answerableRequests }: Props) {
  const [mode, setMode] = useState<"request" | "reply">("request");

  return (
    <section className="page-section comfort-main">
      <div className="section-heading-row">
        <div>
          <h1>위로</h1>
          <p>{hasRequestedToday ? "오늘 남긴 위로 요청이 있어요." : "오늘은 아직 위로 요청을 남기지 않았어요."}</p>
        </div>
      </div>
      <RecentComfortExamples examples={recentExamples} />
      <div className="comfort-tabs" role="tablist" aria-label="오늘 할 일">
        <button type="button" role="tab" aria-selected={mode === "request"} onClick={() => setMode("request")}>
          위로 요청하기
        </button>
        <button type="button" role="tab" aria-selected={mode === "reply"} onClick={() => setMode("reply")}>
          다른 사람에게 답변하기
        </button>
      </div>
      {mode === "request" ? (
        <ComfortRequestForm disabled={hasRequestedToday || !isAuthenticated} />
      ) : (
        <ComfortReplyPanel requests={answerableRequests} isAuthenticated={isAuthenticated} />
      )}
    </section>
  );
}
