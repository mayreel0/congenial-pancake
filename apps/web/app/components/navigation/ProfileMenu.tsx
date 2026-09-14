"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { Skeleton } from "ui/Skeleton";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { useAuth } from "../../lib/auth/useAuth";
import { accountNavItems, landingEntryLinks } from "./routes";

function isActive(activePath: string, href: string) {
  return activePath === href || activePath.startsWith(`${href}/`);
}

type ProfileMenuProps = {
  activePath: string;
  status: ReturnType<typeof useAuth>["status"];
  user: ReturnType<typeof useAuth>["user"];
  open: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle(): void;
  onClose(): void;
  logout(): Promise<void>;
};

// ServiceNav와 랜딩 헤더가 공유 — 로그인 상태면 아바타를 눌러 여는 계정
// 드롭다운(내 정보/내 기록/로그아웃), 비로그인이면 로그인 링크. 랜딩 헤더의
// 아바타가 처음엔 그냥 /today로 가는 링크였는데, "아바타는 당연히 메뉴가
// 열려야지, 예측 가능한 동작으로"라는 피드백에 따라 ServiceNav와 완전히
// 같은 컴포넌트를 쓰도록 추출함(둘째 소비처가 생긴 시점에 추출).
export function ProfileMenu({
  activePath,
  status,
  user,
  open,
  menuRef,
  onToggle,
  onClose,
  logout,
}: ProfileMenuProps) {
  const shouldRenderMenu = useAnimatedPresence(open, POPOVER_EXIT_MS);

  if (status === "authenticated" && user) {
    return (
      <div className="onseol-fade-in relative" ref={menuRef}>
        <button
          aria-expanded={open}
          aria-label="프로필 메뉴"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          type="button"
          onClick={onToggle}
        >
          {user.email.charAt(0).toUpperCase()}
        </button>
        {shouldRenderMenu && (
          <div
            aria-label="프로필"
            className={`absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface shadow-sm ${
              open ? "onseol-popover-enter" : "onseol-popover-leave"
            }`}
          >
            <p className="truncate border-b border-line px-3 py-2 text-xs text-muted">
              {user.email}
            </p>
            {accountNavItems.map((item) => (
              <Link
                aria-current={isActive(activePath, item.href) ? "page" : undefined}
                className="block px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted aria-[current=page]:bg-surface-muted"
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                {item.label}
              </Link>
            ))}
            <button
              className="block w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-surface-muted"
              type="button"
              onClick={() => {
                onClose();
                void logout();
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <Link
        className="onseol-fade-in inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
        href={landingEntryLinks.login}
      >
        로그인
      </Link>
    );
  }

  // status === "loading" — /auth/me hasn't resolved yet, so neither the
  // avatar nor the 로그인 link is correct yet. A same-sized round skeleton
  // keeps the header from flashing empty and holds the layout steady
  // regardless of which one it resolves to.
  return <Skeleton className="h-9 w-9 rounded-full" />;
}
