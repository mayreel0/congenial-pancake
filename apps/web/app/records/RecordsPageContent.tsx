"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "ui/Button";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useAuth } from "../lib/auth/useAuth";
import { MyAnswerLogSection } from "./components/MyAnswerLogSection";
import { MyRequestLogSection } from "./components/MyRequestLogSection";
import { RecordsTabs, type RecordsTab } from "./components/RecordsTabs";

const DEFAULT_TAB: RecordsTab = "requests";

function isRecordsTab(value: string | null): value is RecordsTab {
  return value === "requests" || value === "replies";
}

type RecordsContentProps = {
  status: ReturnType<typeof useAuth>["status"];
  tab: RecordsTab;
  onTabChange(tab: RecordsTab): void;
};

function RecordsContent({ status, tab, onTabChange }: RecordsContentProps) {
  // "loading"을 "authenticated"와 똑같이 취급 — /records는 어차피 거의
  // 항상 로그인된 사람만 들어오는 경로라서, /auth/me가 응답하기 전 잠깐의
  // "loading" 순간에 빈 화면(이전엔 여기서 return null로 떨어짐)이나 게스트
  // 문구가 먼저 보였다가 튀는 깜빡임을 없앤다(2026-09-14, 사용자 리포트).
  // MePageContent와 같은 낙관적 렌더링 — 내부 섹션(MyRequestLogSection 등)이
  // 각자 자기 데이터 로딩의 스켈레톤을 이미 갖고 있음.
  if (status === "loading" || status === "authenticated") {
    return (
      <>
        <section className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            내 기록
          </h1>
        </section>
        <RecordsTabs active={tab} onChange={onTabChange} />
        {tab === "requests" ? <MyRequestLogSection /> : <MyAnswerLogSection />}
      </>
    );
  }

  if (status === "anonymous") {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted">온설</p>
        <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
          내 기록
        </h1>
        <p className="max-w-xl leading-7 text-muted">
          로그인하면 내 기록을 볼 수 있습니다.
        </p>
        <Button href="/login">로그인</Button>
      </section>
    );
  }

  return null;
}

export function RecordsPageContent() {
  const { status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Seeded from the URL once so the tab is shareable/bookmarkable, but
  // rendering drives off local state afterward — a tab click updates the URL
  // as a side effect rather than being the source of truth for the render,
  // so this doesn't depend on the router actually round-tripping through a
  // real Next.js app router (it doesn't in tests).
  const [tab, setTab] = useState<RecordsTab>(() => {
    const param = searchParams.get("tab");
    return isRecordsTab(param) ? param : DEFAULT_TAB;
  });

  function handleTabChange(next: RecordsTab) {
    setTab(next);
    router.replace(`/records?tab=${next}`, { scroll: false });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/records" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <RecordsContent status={status} tab={tab} onTabChange={handleTabChange} />
      </main>
    </div>
  );
}
