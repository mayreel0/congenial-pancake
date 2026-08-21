"use client";

import Link from "next/link";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { formatJoinedDate } from "../lib/format";
import { useAuth } from "../lib/auth/useAuth";

export default function MePage() {
  const { status, user } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl items-center px-5 py-10 sm:px-8">
        {status === "authenticated" && user ? (
          <section className="space-y-3">
            <p className="text-sm text-muted">내 정보</p>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
              내 기록
            </h1>
            <div className="space-y-1 text-muted">
              <p>{user.email}</p>
              <p className="text-sm">{formatJoinedDate(user.createdAt)} 가입</p>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted">
              지금 남긴 온설과 답변은 아직 이 계정과 연결되지 않은 로컬 프로토타입
              데이터입니다 — 실제 연결은 다음 단계에서 다룹니다.
            </p>
          </section>
        ) : status === "anonymous" ? (
          <section className="space-y-3">
            <p className="text-sm text-muted">내 정보</p>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
              내 기록
            </h1>
            <p className="max-w-xl leading-7 text-muted">
              로그인하면 내 기록을 볼 수 있습니다.
            </p>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              href="/login"
            >
              로그인
            </Link>
          </section>
        ) : null}
      </main>
    </div>
  );
}
