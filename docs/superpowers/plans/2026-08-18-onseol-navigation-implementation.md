# Onseol Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the first navigation layer that separates landing entry from service navigation and prepares `/answer`, `/read`, `/me`, and login entry routes.

**Architecture:** Keep landing navigation and service navigation as separate components. Wrap service pages with a small client-side navigation shell that reads the active route and controls the mobile menu, while placeholder pages keep future route work unblocked.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, React Testing Library, jsdom, pnpm.

## Global Constraints

- Base branch is `v1`; do not push directly to `main` or `v1`.
- Landing and service navigation must remain separate.
- Landing shows `온설`, `로그인`, and `웹에서 시작하기`; it must not show the full service menu.
- Service navigation routes are `남기기` -> `/today`, `답하기` -> `/answer`, `온설 읽기` -> `/read`, `내 기록` -> `/me`.
- Web service screens use top nav.
- Mobile service screens use a top-left menu button, not a bottom tab bar.
- Non-authenticated state can use static `로그인` copy; real auth is excluded.
- Login route is not finalized by backend auth yet; implement `/login` as a placeholder route for this PR.
- Keep copy 담백 and avoid AI prompt-chip styling.
- Preserve dark-mode token usage through existing CSS variables.

---

## File Structure

- Create `app/components/navigation/routes.ts`
  - Single source for service nav items and landing entry routes.
- Create `app/components/navigation/LandingHeader.tsx`
  - Landing-only header with brand, login link, and web-start CTA.
- Create `app/components/navigation/ServiceNav.tsx`
  - Client component for desktop service nav, mobile menu button, mobile menu panel, active route state.
- Create `app/components/navigation/ServiceNav.test.tsx`
  - Unit tests for desktop links, mobile menu behavior, active route, and absence of bottom tab.
- Modify `app/components/landing/LandingPage.tsx`
  - Render `LandingHeader` above the existing landing hero/stats/sample exchange layout.
- Add `app/components/landing/LandingPage.test.tsx`
  - Verify landing entry links and service-menu exclusion.
- Modify `app/today/TodayPrototype.tsx`
  - Wrap the current focused `/today` screen with `ServiceNav` and keep existing layout intact.
- Add `app/answer/page.tsx`
  - Placeholder page for answer flow with `ServiceNav`.
- Add `app/read/page.tsx`
  - Placeholder page for read flow with `ServiceNav`.
- Add `app/me/page.tsx`
  - Placeholder page for my records with `ServiceNav`.
- Add `app/login/page.tsx`
  - Placeholder page for login entry.
- Modify `docs/work-logs/2026-08-17-today-redesign-implementation.md`
  - Keep the visual/mobile UX note already recorded for wiki promotion in this PR.

---

### Task 1: Navigation Route Constants

**Files:**
- Create: `app/components/navigation/routes.ts`

**Interfaces:**
- Produces:
  - `serviceNavItems: Array<{ label: string; href: string }>`
  - `landingEntryLinks: { start: string; login: string }`

- [x] **Step 1: Add route constants**

Create `app/components/navigation/routes.ts`:

```ts
export const serviceNavItems = [
  { label: "남기기", href: "/today" },
  { label: "답하기", href: "/answer" },
  { label: "온설 읽기", href: "/read" },
  { label: "내 기록", href: "/me" },
] as const;

export const landingEntryLinks = {
  start: "/today",
  login: "/login",
} as const;
```

- [x] **Step 2: Commit**

```bash
git add app/components/navigation/routes.ts
git commit -m "feat: add navigation route constants"
```

---

### Task 2: Landing Header

**Files:**
- Create: `app/components/navigation/LandingHeader.tsx`
- Modify: `app/components/landing/LandingPage.tsx`
- Add: `app/components/landing/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `landingEntryLinks` from `routes.ts`
- Produces: Landing header with brand, login link, and web-start CTA.

- [x] **Step 1: Write failing landing tests**

Create `app/components/landing/LandingPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  it("shows landing entry navigation", () => {
    render(<LandingPage />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "온설" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.getByRole("link", { name: "웹에서 시작하기" }),
    ).toHaveAttribute("href", "/today");
  });

  it("does not expose the full service menu on landing", () => {
    render(<LandingPage />);

    expect(screen.queryByRole("link", { name: "답하기" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "온설 읽기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "내 기록" }),
    ).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify RED**

Run: `pnpm test app/components/landing/LandingPage.test.tsx`

Expected: FAIL because `banner` and `/login` landing header do not exist.

- [x] **Step 3: Implement landing header**

Create `app/components/navigation/LandingHeader.tsx`:

```tsx
import Link from "next/link";
import { landingEntryLinks } from "./routes";

export function LandingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link
        className="text-base font-semibold text-foreground"
        href="/"
      >
        온설
      </Link>
      <nav aria-label="랜딩 진입" className="flex items-center gap-2">
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
      </nav>
    </header>
  );
}
```

Modify `app/components/landing/LandingPage.tsx` to render `<LandingHeader />` before the existing content.

- [x] **Step 4: Run landing tests**

Run: `pnpm test app/components/landing/LandingPage.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/components/navigation/LandingHeader.tsx app/components/navigation/routes.ts app/components/landing/LandingPage.tsx app/components/landing/LandingPage.test.tsx
git commit -m "feat: add landing entry header"
```

---

### Task 3: Service Navigation Shell

**Files:**
- Create: `app/components/navigation/ServiceNav.tsx`
- Add: `app/components/navigation/ServiceNav.test.tsx`

**Interfaces:**
- Consumes: `serviceNavItems` and `landingEntryLinks` from `routes.ts`
- Produces:
  - `ServiceNav({ activePath }: { activePath: string })`

- [x] **Step 1: Write failing service nav tests**

Create `app/components/navigation/ServiceNav.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceNav } from "./ServiceNav";

describe("ServiceNav", () => {
  it("shows desktop service links and login entry", () => {
    render(<ServiceNav activePath="/today" />);

    const desktopNav = screen.getByLabelText("서비스 주요 이동");
    expect(within(desktopNav).getByRole("link", { name: "남기기" })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(within(desktopNav).getByRole("link", { name: "답하기" })).toHaveAttribute(
      "href",
      "/answer",
    );
    expect(
      within(desktopNav).getByRole("link", { name: "온설 읽기" }),
    ).toHaveAttribute("href", "/read");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("marks the active route", () => {
    render(<ServiceNav activePath="/answer" />);

    expect(screen.getByRole("link", { name: "답하기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens mobile menu with service links including my records", () => {
    render(<ServiceNav activePath="/today" />);

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

    const mobileMenu = screen.getByLabelText("모바일 서비스 이동");
    expect(within(mobileMenu).getByRole("link", { name: "남기기" })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(within(mobileMenu).getByRole("link", { name: "내 기록" })).toHaveAttribute(
      "href",
      "/me",
    );
    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toBeInTheDocument();
  });

  it("does not render a mobile bottom tab", () => {
    render(<ServiceNav activePath="/today" />);

    expect(screen.queryByLabelText("하단 탭")).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify RED**

Run: `pnpm test app/components/navigation/ServiceNav.test.tsx`

Expected: FAIL because `ServiceNav` does not exist.

- [x] **Step 3: Implement service navigation**

Create `app/components/navigation/ServiceNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { landingEntryLinks, serviceNavItems } from "./routes";

type ServiceNavProps = {
  activePath: string;
};

function isActive(activePath: string, href: string) {
  return activePath === href || activePath.startsWith(`${href}/`);
}

export function ServiceNav({ activePath }: ServiceNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-lg font-semibold text-foreground md:hidden"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "×" : "≡"}
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
        <Link
          className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
          href={landingEntryLinks.login}
        >
          로그인
        </Link>
      </div>
      {menuOpen ? (
        <nav
          aria-label="모바일 서비스 이동"
          className="border-t border-line bg-background px-5 py-3 md:hidden"
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
```

- [x] **Step 4: Run service nav tests**

Run: `pnpm test app/components/navigation/ServiceNav.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add app/components/navigation/ServiceNav.tsx app/components/navigation/ServiceNav.test.tsx
git commit -m "feat: add service navigation"
```

---

### Task 4: Wire Service Routes

**Files:**
- Modify: `app/today/TodayPrototype.tsx`
- Add: `app/answer/page.tsx`
- Add: `app/read/page.tsx`
- Add: `app/me/page.tsx`
- Add: `app/login/page.tsx`
- Modify: `app/today/TodayPrototype.test.tsx`

**Interfaces:**
- Consumes: `ServiceNav({ activePath })`
- Produces: service routes with navigation and focused placeholder content.

- [x] **Step 1: Update `/today` test for service nav**

Add to `app/today/TodayPrototype.test.tsx`:

```tsx
it("renders service navigation on today", () => {
  render(<TodayPrototype />);

  expect(screen.getByRole("link", { name: "온설" })).toHaveAttribute(
    "href",
    "/today",
  );
  expect(screen.getByRole("link", { name: "남기기" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
    "href",
    "/login",
  );
});
```

- [x] **Step 2: Run test to verify RED**

Run: `pnpm test app/today/TodayPrototype.test.tsx`

Expected: FAIL because `/today` does not render `ServiceNav`.

- [x] **Step 3: Wrap `/today` with `ServiceNav`**

Modify `app/today/TodayPrototype.tsx` to import `ServiceNav` and render:

```tsx
return (
  <div className="min-h-dvh bg-background text-foreground">
    <ServiceNav activePath="/today" />
    <main className="flex min-h-[calc(100dvh-3.5rem)] px-5 py-10 sm:items-center sm:px-8">
      ...
    </main>
    {showSuccessToast ? ... : null}
  </div>
);
```

Keep the existing entry layout, toast, composer, and activity sentence behavior.

- [x] **Step 4: Add placeholder routes**

Create `app/answer/page.tsx`:

```tsx
import { ServiceNav } from "../components/navigation/ServiceNav";

export default function AnswerPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/answer" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl items-center px-5 py-10 sm:px-8">
        <section className="space-y-3">
          <p className="text-sm text-muted">답하기</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            누군가에게 짧게 답하기
          </h1>
          <p className="max-w-xl leading-7 text-muted">
            답변이 필요한 온설을 이어서 보여주는 화면은 다음 PR에서 다룹니다.
          </p>
        </section>
      </main>
    </div>
  );
}
```

Create equivalent placeholder pages:

- `app/read/page.tsx`
  - active path `/read`
  - heading `다른 온설 읽기`
  - body `다른 사람의 온설과 답변을 읽는 화면은 다음 PR에서 다룹니다.`
- `app/me/page.tsx`
  - active path `/me`
  - heading `내 기록`
  - body `내가 남긴 온설과 답변을 보는 화면은 로그인 흐름과 함께 다룹니다.`
- `app/login/page.tsx`
  - no `ServiceNav`
  - heading `로그인`
  - body `로그인 방식은 인증 스펙에서 확정합니다.`
  - link back to `/today` with label `비회원으로 계속하기`

- [x] **Step 5: Run targeted tests**

Run:

```bash
pnpm test app/today/TodayPrototype.test.tsx app/components/navigation/ServiceNav.test.tsx
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add app/today/TodayPrototype.tsx app/today/TodayPrototype.test.tsx app/answer/page.tsx app/read/page.tsx app/me/page.tsx app/login/page.tsx
git commit -m "feat: wire service navigation routes"
```

---

### Task 5: Final Verification And Work Log

**Files:**
- Modify: `docs/work-logs/2026-08-17-today-redesign-implementation.md`

**Interfaces:**
- Consumes: implemented navigation behavior.
- Produces: verification record for PR and future wiki promotion.

- [x] **Step 1: Run full verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands pass.

- [x] **Step 2: Record verification**

Append a short note to the relevant work log:

```md
## 네비게이션 구현 메모

- 랜딩과 서비스 네비게이션을 분리했다.
- 서비스 모바일 네비게이션은 하단 탭이 아니라 상단 메뉴 버튼으로 둔다.
- `/answer`, `/read`, `/me`, `/login`은 이동 검증을 위한 placeholder로만 추가했다.
- 실제 인증, 내 기록 데이터, 읽기/답하기 본문 구현은 후속 PR로 남긴다.
```

- [x] **Step 3: Commit**

```bash
git add docs/work-logs/2026-08-17-today-redesign-implementation.md
git commit -m "docs: record navigation implementation notes"
```

- [x] **Step 4: Open PR**

Use the project PR workflow. PR body must mention:

- Landing entry header.
- Service nav desktop/mobile behavior.
- Placeholder routes.
- Visual/mobile UX note included for wiki promotion.
- Verification commands and results.
