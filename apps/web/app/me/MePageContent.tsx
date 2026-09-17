"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "ui/Button";
import { AuthCheckingSpinner } from "../components/shared/AuthCheckingSpinner";
import { OAUTH_PROVIDER_NAMES_KO } from "../components/shared/oauthProviders";
import { formatJoinedDate } from "../lib/format";
import { loginHrefWithReturnTo } from "../lib/auth/loginHref";
import { useAuth } from "../lib/auth/useAuth";
import { LinkedProvidersSection } from "./components/LinkedProvidersSection";
import { NicknameSection } from "./components/NicknameSection";
import { NicknameVisibilitySection } from "./components/NicknameVisibilitySection";
import { ProfileVisibilitySection } from "./components/ProfileVisibilitySection";
import { VisibilityDraftProvider } from "./components/VisibilityDraftProvider";
import { WithdrawalSection } from "./components/WithdrawalSection";

type MeContentProps = {
  status: ReturnType<typeof useAuth>["status"];
  user: ReturnType<typeof useAuth>["user"];
  notice: string | null;
};

function PageTitle() {
  return (
    <>
      <p className="text-sm text-muted">온설</p>
      <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
        내 정보
      </h1>
    </>
  );
}

function MeContent({ status, user, notice }: MeContentProps) {
  // "loading" (still resolving /auth/me) gets a generic spinner, never the
  // member-only section shapes below (a guest landing here for the first
  // time shouldn't see "연동된 계정"/"닉네임" placeholders that then vanish
  // into a login prompt) and no title either (2026-09-14 피드백: 타이틀 아래
  // 스피너를 붙이는 구성 자체가 어색함) — the page no longer vertically
  // centers its content, so the loading spinner just sits where the title
  // normally would, at the top. Once we know the viewer is authenticated,
  // `user` is already populated (toAuthStatus in useAuth.ts derives
  // "authenticated" from having data), so there's no separate "authenticated
  // but data still loading" gap here to cover with its own skeleton.
  if (status === "loading") {
    return (
      <div className="onseol-fade-in">
        <AuthCheckingSpinner />
      </div>
    );
  }

  if (status === "authenticated" && user) {
    return (
      <div className="onseol-fade-in flex flex-col gap-8">
        <section className="space-y-3">
          <PageTitle />
          <div className="space-y-1 text-muted">
            <p>{user.email}</p>
            <p className="text-sm">{formatJoinedDate(user.createdAt)} 가입</p>
          </div>
          {notice && <p className="text-sm text-primary">{notice}</p>}
        </section>
        <LinkedProvidersSection linkedProviders={user.linkedProviders} />
        <NicknameSection />
        <VisibilityDraftProvider user={user}>
          <NicknameVisibilitySection />
          <ProfileVisibilitySection />
        </VisibilityDraftProvider>
        <WithdrawalSection />
      </div>
    );
  }

  return (
    <section className="onseol-fade-in space-y-3">
      <PageTitle />
      <p className="max-w-xl leading-7 text-muted">
        로그인하면 내 정보를 볼 수 있습니다.
      </p>
      <Button href={loginHrefWithReturnTo("/me")}>로그인</Button>
    </section>
  );
}

function linkNotice(searchParams: URLSearchParams): string | null {
  const linked = searchParams.get("linked");
  if (linked) {
    const label =
      linked in OAUTH_PROVIDER_NAMES_KO
        ? OAUTH_PROVIDER_NAMES_KO[linked as keyof typeof OAUTH_PROVIDER_NAMES_KO]
        : linked;
    return `${label} 계정을 연동했어요.`;
  }
  if (searchParams.get("merged") === "1") {
    return "이미 등록된 이메일이라 기존 계정으로 연결했어요.";
  }
  return null;
}

export function MePageContent() {
  const { status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = linkNotice(searchParams);

  useEffect(() => {
    // One-time toast, not shareable state — drop it from the URL so
    // refreshing (or sharing the link) doesn't keep re-showing it.
    if (notice) router.replace("/me");
  }, [notice, router]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <MeContent key={status} notice={notice} status={status} user={user} />
    </main>
  );
}
