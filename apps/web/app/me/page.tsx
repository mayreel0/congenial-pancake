"use client";

import { Button } from "ui/Button";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { formatJoinedDate } from "../lib/format";
import { useAuth } from "../lib/auth/useAuth";
import { NicknameSection } from "./components/NicknameSection";
import { ProfileVisibilitySection } from "./components/ProfileVisibilitySection";

type MeContentProps = {
  status: ReturnType<typeof useAuth>["status"];
  user: ReturnType<typeof useAuth>["user"];
};

// Early return instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function MeContent({ status, user }: MeContentProps) {
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
        </section>
        <NicknameSection />
        <ProfileVisibilitySection />
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

export default function MePage() {
  const { status, user } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <MeContent status={status} user={user} />
      </main>
    </div>
  );
}
