"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "ui/Button";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { OAUTH_PROVIDER_NAMES_KO } from "../components/shared/oauthProviders";
import { formatJoinedDate } from "../lib/format";
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

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function MeContent({ status, user, notice }: MeContentProps) {
  if (status === "authenticated" && user) {
    return (
      <>
        <section className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            내 정보
          </h1>
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
      </>
    );
  }

  if (status === "anonymous") {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted">온설</p>
        <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
          내 정보
        </h1>
        <p className="max-w-xl leading-7 text-muted">
          로그인하면 내 정보를 볼 수 있습니다.
        </p>
        <Button href="/login">로그인</Button>
      </section>
    );
  }

  return null;
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
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <MeContent notice={notice} status={status} user={user} />
      </main>
    </div>
  );
}
