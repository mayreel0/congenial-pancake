"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "ui/Button";
import { AuthCheckingSpinner } from "../components/shared/AuthCheckingSpinner";
import { loginHrefWithReturnTo } from "../lib/auth/loginHref";
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
  const pathname = usePathname();
  // 로그인 필요 페이지의 공통 4단계(2026-09-14 확정 원칙): 로그인 확인
  // 중 → 중립 로딩, 확인 후 비로그인 → 로그인 필요, 로그인 + 데이터
  // 로딩 중 → 스켈레톤(MyRequestLogSection 등이 각자 갖고 있음), 데이터
  // 준비 → 실제 화면. "loading"에서 섹션을 먼저 마운트해버리면(이전
  // 방식) 아직 로그인 여부도 모르는 채로 /requests·replies/mine을
  // 호출해버려서, 비로그인 사용자에게 401 이후의 "아직 없습니다" 같은
  // 틀린 빈 상태가 잠깐 보일 수 있었음 — status가 authenticated로
  // 확정되기 전엔 아예 마운트하지 않는다. loading 동안은 타이틀도 같이
  // 감춤(2026-09-14 피드백) — 페이지가 더 이상 세로 중앙 정렬을 쓰지
  // 않으므로, 로딩 스피너가 타이틀 자리에 그대로 놓이면 됨.
  if (status === "loading") {
    return (
      <div className="onseol-fade-in">
        <AuthCheckingSpinner />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="onseol-fade-in flex flex-col gap-8">
        <section className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            내 기록
          </h1>
        </section>
        <RecordsTabs active={tab} onChange={onTabChange} />
        {tab === "requests" ? <MyRequestLogSection /> : <MyAnswerLogSection />}
      </div>
    );
  }

  return (
    <section className="onseol-fade-in space-y-3">
      <p className="text-sm text-muted">온설</p>
      <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
        내 기록
      </h1>
      <p className="max-w-xl leading-7 text-muted">
        로그인하면 내 기록을 볼 수 있습니다.
      </p>
      <Button
        href={loginHrefWithReturnTo(
          tab === "replies" ? `${pathname}?tab=replies` : pathname,
        )}
      >
        로그인
      </Button>
    </section>
  );
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
  // Tracks the tab value *we* last intentionally set (via a click below, or
  // this same sync effect), independent of React's render timing — lets the
  // sync effect below tell "searchParams just hasn't caught up with our own
  // click yet" apart from "the URL changed for some other reason" without
  // depending on `tab` itself (which would re-fire this effect on every
  // click and briefly bounce the tab back to the pre-click value, since
  // router.replace()'s URL update isn't synchronous with setTab()).
  const lastSyncedTabRef = useRef(tab);

  // A same-route navigation to a different ?tab= (e.g. a Link from
  // elsewhere pointing at /records?tab=requests while this page is already
  // mounted showing 답변) doesn't remount this component, so the seed-once
  // useState above never re-runs on its own — sync it explicitly whenever
  // Next.js hands back a new searchParams.
  useEffect(() => {
    const param = searchParams.get("tab");
    if (isRecordsTab(param) && param !== lastSyncedTabRef.current) {
      lastSyncedTabRef.current = param;
      setTab(param);
    }
  }, [searchParams]);

  function handleTabChange(next: RecordsTab) {
    lastSyncedTabRef.current = next;
    setTab(next);
    router.replace(`/records?tab=${next}`, { scroll: false });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <RecordsContent
        key={status}
        status={status}
        tab={tab}
        onTabChange={handleTabChange}
      />
    </main>
  );
}
