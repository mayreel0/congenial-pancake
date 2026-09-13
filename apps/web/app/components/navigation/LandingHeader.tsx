"use client";

import Link from "next/link";
import { useAuth } from "../../lib/auth/useAuth";
import { landingEntryLinks } from "./routes";

type LandingHeaderNavProps = {
  status: ReturnType<typeof useAuth>["status"];
  user: ReturnType<typeof useAuth>["user"];
};

// 로그인 상태에서 "웹에서 계속하기" 버튼을 없앤 건, 히어로 섹션의
// EntryActions에 이미 같은 목적(앱으로 진입)의 CTA가 있어서 헤더에 또
// 두면 중복이기 때문 — 아바타 자체가 /today로 가는 진입점 역할을 함.
// 로그아웃은 여기서 굳이 안 넣음(랜딩은 마케팅 페이지라 아바타는 "로그인
// 상태 표시 + 진입"만 담당, 실제 로그아웃은 /today 이후 ServiceNav에서).
function LandingHeaderNav({ status, user }: LandingHeaderNavProps) {
  if (status === "authenticated" && user) {
    return (
      <Link
        aria-label="온설로 이동"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        href={landingEntryLinks.start}
      >
        {user.email.charAt(0).toUpperCase()}
      </Link>
    );
  }

  if (status === "anonymous") {
    return (
      <Link
        className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
        href={landingEntryLinks.login}
      >
        로그인
      </Link>
    );
  }

  return null;
}

export function LandingHeader() {
  const { status, user } = useAuth();

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="text-base font-semibold text-foreground" href="/">
        온설
      </Link>
      <nav aria-label="랜딩 진입" className="flex items-center gap-2">
        <LandingHeaderNav status={status} user={user} />
      </nav>
    </header>
  );
}
