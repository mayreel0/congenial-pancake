"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth/useAuth";

const NAV_ITEMS = [
  { href: "/", label: "신고 검토" },
  { href: "/settings", label: "설정" },
  { href: "/accounts", label: "계정" },
];

type AdminNavProps = {
  activePath: string;
};

// Takes activePath as an explicit prop (like apps/web's ServiceNav) instead
// of calling usePathname() — avoids needing App Router context in tests,
// and each page already knows its own path. Renders unconditionally,
// regardless of auth status — it reads the same auth query every page
// does, so gating its mount on that query's own loading state would
// mount/unmount it every time the query refetches on (re)mount, which
// retriggers another refetch, forever. See docs/decisions/2026-08-25-
// onseol-admin-app-split-decisions.md.
export function AdminNav({ activePath }: AdminNavProps) {
  const auth = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-line px-5 sm:px-8">
      <div className="flex items-center gap-6">
        <p className="text-sm font-semibold text-foreground">온설 관리</p>
        <nav className="flex items-center gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              className={
                activePath === item.href
                  ? "text-sm font-semibold text-foreground"
                  : "text-sm text-muted transition hover:text-foreground"
              }
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {auth.status === "authenticated" ? (
        <button
          className="text-sm text-muted transition hover:text-foreground"
          type="button"
          onClick={() => void auth.logout()}
        >
          로그아웃
        </button>
      ) : null}
    </header>
  );
}
