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

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function RecordsContent({ status, tab, onTabChange }: RecordsContentProps) {
  if (status === "authenticated") {
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
