"use client";

import { Button } from "ui/Button";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useAuth } from "../lib/auth/useAuth";
import { MyAnswerLogSection } from "./components/MyAnswerLogSection";

type RecordsContentProps = {
  status: ReturnType<typeof useAuth>["status"];
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function RecordsContent({ status }: RecordsContentProps) {
  if (status === "authenticated") {
    return (
      <>
        <section className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            내 기록
          </h1>
        </section>
        <MyAnswerLogSection />
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

export default function RecordsPage() {
  const { status } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/records" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <RecordsContent status={status} />
      </main>
    </div>
  );
}
