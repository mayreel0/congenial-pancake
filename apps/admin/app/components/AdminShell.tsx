"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { toast } from "ui/useToast";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { useAuth } from "../lib/auth/useAuth";

const NAV_ITEMS = [
  { href: "/review", label: "신고 검토" },
  { href: "/settings", label: "설정" },
  { href: "/accounts", label: "계정" },
];

const SIDEBAR_WIDTH = "14rem";

type ToggleIconProps = {
  open: boolean;
};

// Same 3-span hamburger-to-X shape used by ServiceNav's and this app's own
// mobile menu — reused here for the desktop sidebar's open/close control
// instead of inventing a second icon style.
function ToggleIcon({ open }: ToggleIconProps) {
  return (
    <>
      <span
        aria-hidden="true"
        className={[
          "absolute h-0.5 w-4 rounded-full bg-current transition",
          open ? "rotate-45" : "-translate-y-1.5",
        ].join(" ")}
      />
      <span
        aria-hidden="true"
        className={[
          "absolute h-0.5 w-4 rounded-full bg-current transition",
          open ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <span
        aria-hidden="true"
        className={[
          "absolute h-0.5 w-4 rounded-full bg-current transition",
          open ? "-rotate-45" : "translate-y-1.5",
        ].join(" ")}
      />
    </>
  );
}

type AdminShellProps = {
  activePath: string;
  children: ReactNode;
};

// Takes activePath as an explicit prop (like apps/web's ServiceNav) instead
// of calling usePathname() — avoids needing App Router context in tests,
// and each page already knows its own path. Renders unconditionally,
// regardless of auth status — it reads the same auth query every page
// does, so gating its mount on that query's own loading state would
// mount/unmount it every time the query refetches on (re)mount, which
// retriggers another refetch, forever. See docs/decisions/2026-08-25-
// onseol-admin-app-split-decisions.md.
//
// Mobile (< md) keeps the top-bar-plus-dropdown treatment from before.
// Desktop (>= md) gets a collapsible left sidebar instead of the old inline
// nav links — its own toggle button lives in the shared top bar (next to
// the mobile hamburger, each hidden on the other breakpoint) so there's
// always exactly one control for whichever nav treatment is active.
// `{children}` is rendered exactly once — only the chrome around it
// (sidebar presence, which toggle button shows) is responsive, so page
// content/queries never double-mount at both breakpoints.
export function AdminShell({ activePath, children }: AdminShellProps) {
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const shouldRenderMobileMenu = useAnimatedPresence(
    menuOpen,
    POPOVER_EXIT_MS,
  );

  async function handleLogout() {
    try {
      await auth.logout();
    } catch (error) {
      toast.error(error);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground md:flex-row">
      <aside
        className="hidden shrink-0 overflow-hidden border-r border-line bg-surface transition-[width] duration-200 md:block"
        style={{ width: sidebarOpen ? SIDEBAR_WIDTH : "0" }}
      >
        <nav
          aria-label="관리 메뉴"
          className="flex h-full flex-col gap-1 p-4"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              aria-current={activePath === item.href ? "page" : undefined}
              className={[
                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                activePath === item.href
                  ? "bg-surface-muted text-foreground"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              ].join(" ")}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
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
                <ToggleIcon open={menuOpen} />
              </button>
              <button
                aria-expanded={sidebarOpen}
                aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
                className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-foreground md:inline-flex"
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
              >
                <ToggleIcon open={sidebarOpen} />
              </button>
              <p className="text-sm font-semibold text-foreground">
                온설 관리
              </p>
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
              aria-label="모바일 관리 메뉴"
              className={`absolute left-0 right-0 top-full z-10 border-b border-line bg-background px-5 py-3 shadow-sm md:hidden ${
                menuOpen ? "onseol-popover-enter" : "onseol-popover-leave"
              }`}
            >
              <div className="grid gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    aria-current={
                      activePath === item.href ? "page" : undefined
                    }
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
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
