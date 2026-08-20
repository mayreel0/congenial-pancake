"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { landingEntryLinks, serviceNavItems } from "./routes";

type ServiceNavProps = {
  activePath: string;
};

function isActive(activePath: string, href: string) {
  return activePath === href || activePath.startsWith(`${href}/`);
}

export function ServiceNav({ activePath }: ServiceNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { status, user, logout } = useAuth();

  return (
    <header className="relative sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-4">
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
          <Link className="text-base font-semibold text-foreground" href="/today">
            온설
          </Link>
          <nav
            aria-label="서비스 주요 이동"
            className="hidden items-center gap-1 md:flex"
          >
            {serviceNavItems
              .filter((item) => item.href !== "/me")
              .map((item) => {
                const active = isActive(activePath, item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={[
                      "inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition",
                      active
                        ? "bg-surface-muted text-foreground"
                        : "text-muted hover:bg-surface-muted hover:text-foreground",
                    ].join(" ")}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </div>
        <nav aria-label="개인 영역" className="flex items-center gap-1">
          <Link
            aria-current={isActive(activePath, "/me") ? "page" : undefined}
            className={[
              "hidden h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition sm:inline-flex",
              isActive(activePath, "/me")
                ? "bg-surface-muted text-foreground"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            ].join(" ")}
            href="/me"
          >
            내 기록
          </Link>
          {status === "authenticated" && user ? (
            <>
              <span className="hidden max-w-32 truncate text-sm text-muted sm:inline">
                {user.email}
              </span>
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
                type="button"
                onClick={() => void logout()}
              >
                로그아웃
              </button>
            </>
          ) : status === "anonymous" ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
              href={landingEntryLinks.login}
            >
              로그인
            </Link>
          ) : null}
        </nav>
      </div>
      {menuOpen ? (
        <nav
          aria-label="모바일 서비스 이동"
          className="absolute left-0 right-0 top-full border-b border-line bg-background px-5 py-3 shadow-sm md:hidden"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-1">
            {serviceNavItems.map((item) => {
              const active = isActive(activePath, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-lg px-3 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-surface-muted text-foreground"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  ].join(" ")}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
