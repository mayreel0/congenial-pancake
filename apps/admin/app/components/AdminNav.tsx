"use client";

import Link from "next/link";
import { useState } from "react";
import { Toast } from "ui/Toast";
import { useToast } from "ui/useToast";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { useAuth } from "../lib/auth/useAuth";

const NAV_ITEMS = [
  { href: "/review", label: "신고 검토" },
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
  const { toast, showError, dismiss } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const shouldRenderMobileMenu = useAnimatedPresence(
    menuOpen,
    POPOVER_EXIT_MS,
  );

  async function handleLogout() {
    try {
      await auth.logout();
    } catch (error) {
      showError(error);
    }
  }

  return (
    <header className="relative border-b border-line px-5 sm:px-8">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-foreground md:hidden"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              aria-hidden="true"
              className={[
                "absolute h-0.5 w-4 rounded-full bg-current transition",
                menuOpen ? "rotate-45" : "-translate-y-1.5",
              ].join(" ")}
            />
            <span
              aria-hidden="true"
              className={[
                "absolute h-0.5 w-4 rounded-full bg-current transition",
                menuOpen ? "opacity-0" : "opacity-100",
              ].join(" ")}
            />
            <span
              aria-hidden="true"
              className={[
                "absolute h-0.5 w-4 rounded-full bg-current transition",
                menuOpen ? "-rotate-45" : "translate-y-1.5",
              ].join(" ")}
            />
          </button>
          <p className="text-sm font-semibold text-foreground">온설 관리</p>
          <nav className="hidden items-center gap-4 md:flex">
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
        {auth.status === "authenticated" && (
          <button
            className="text-sm text-muted transition hover:text-foreground"
            type="button"
            onClick={() => void handleLogout()}
          >
            로그아웃
          </button>
        )}
      </div>
      {shouldRenderMobileMenu && (
        <nav
          aria-label="관리 메뉴"
          className={`absolute left-0 right-0 top-full z-10 border-b border-line bg-background px-5 py-3 shadow-sm md:hidden ${
            menuOpen ? "onseol-popover-enter" : "onseol-popover-leave"
          }`}
        >
          <div className="grid gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                aria-current={activePath === item.href ? "page" : undefined}
                className={[
                  "rounded-lg px-3 py-3 text-sm font-semibold transition",
                  activePath === item.href
                    ? "bg-surface-muted text-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                ].join(" ")}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
      <Toast toast={toast} onDismiss={dismiss} />
    </header>
  );
}
