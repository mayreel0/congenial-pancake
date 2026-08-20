"use client";

import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
import { landingEntryLinks } from "./routes";

export function LandingHeader() {
  const { status, user, logout } = useAuth();

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="text-base font-semibold text-foreground" href="/">
        온설
      </Link>
      <nav aria-label="랜딩 진입" className="flex items-center gap-2">
        {status === "authenticated" && user ? (
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
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              href={landingEntryLinks.start}
            >
              웹에서 계속하기
            </Link>
          </>
        ) : status === "anonymous" ? (
          <>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
              href={landingEntryLinks.login}
            >
              로그인
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              href={landingEntryLinks.start}
            >
              웹에서 시작하기
            </Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}
