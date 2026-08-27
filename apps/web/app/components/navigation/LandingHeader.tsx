"use client";

import Link from "next/link";
import { Button } from "ui/Button";
import { useAuth } from "../../lib/auth/useAuth";
import { landingEntryLinks } from "./routes";

type LandingHeaderNavProps = {
  status: ReturnType<typeof useAuth>["status"];
  user: ReturnType<typeof useAuth>["user"];
  logout(): Promise<void>;
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function LandingHeaderNav({ status, user, logout }: LandingHeaderNavProps) {
  if (status === "authenticated" && user) {
    return (
      <>
        <span className="hidden max-w-32 truncate text-sm text-muted sm:inline">
          {user.email}
        </span>
        <button
          className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
          type="button"
          onClick={() => void logout()}
        >
          로그아웃
        </button>
        <Button href={landingEntryLinks.start} size="sm">
          웹에서 계속하기
        </Button>
      </>
    );
  }

  if (status === "anonymous") {
    return (
      <>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
          href={landingEntryLinks.login}
        >
          로그인
        </Link>
        <Button href={landingEntryLinks.start} size="sm">
          웹에서 시작하기
        </Button>
      </>
    );
  }

  return null;
}

export function LandingHeader() {
  const { status, user, logout } = useAuth();

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="text-base font-semibold text-foreground" href="/">
        온설
      </Link>
      <nav aria-label="랜딩 진입" className="flex items-center gap-2">
        <LandingHeaderNav logout={logout} status={status} user={user} />
      </nav>
    </header>
  );
}
