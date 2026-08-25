"use client";

import Link from "next/link";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { formatJoinedDate, formatTimestamp } from "../lib/format";
import { useAuth } from "../lib/auth/useAuth";
import type { MyAnswerLogEntryDto } from "../lib/replies/api";
import { useMyAnswerLogQuery } from "../lib/replies/queries";

function AnswerLogCard({ entry }: { entry: MyAnswerLogEntryDto }) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-background px-4 py-4 shadow-sm sm:px-5">
      <article className="max-w-[85%] space-y-1.5 self-start rounded-lg border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
        <p className="text-xs font-semibold text-muted">온설</p>
        <p className="text-sm leading-6 text-foreground">{entry.requestBody}</p>
        <time
          className="block text-xs text-muted"
          dateTime={entry.requestCreatedAt}
          suppressHydrationWarning
        >
          {formatTimestamp(entry.requestCreatedAt)}
        </time>
      </article>
      <div className="flex justify-end">
        <article className="max-w-[85%] space-y-1.5 rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
          <p className="text-xs font-semibold text-muted">내 답변</p>
          <p className="text-sm leading-6 text-foreground">{entry.replyBody}</p>
          <time
            className="block text-xs text-muted"
            dateTime={entry.replyCreatedAt}
            suppressHydrationWarning
          >
            {formatTimestamp(entry.replyCreatedAt)}
          </time>
        </article>
      </div>
    </li>
  );
}

function MyAnswerLogSection() {
  const answerLog = useMyAnswerLogQuery();
  const entries = answerLog.data ?? [];

  return (
    <section className="space-y-4" aria-labelledby="my-answer-log-heading">
      <div className="space-y-1">
        <h2
          className="text-lg font-semibold tracking-normal"
          id="my-answer-log-heading"
        >
          내가 남긴 답변
        </h2>
        <p className="text-sm text-muted">
          내가 어떤 온설에 어떤 답을 남겼는지 모아봤어요.
        </p>
      </div>
      {answerLog.isPending || answerLog.isLoading ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
          답변 기록을 불러오는 중입니다.
        </p>
      ) : entries.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm">
          <p className="text-sm text-muted">아직 남긴 답변이 없습니다.</p>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            href="/answer"
          >
            답변 남기러 가기
          </Link>
        </div>
      ) : (
        <ol className="space-y-4">
          {entries.map((entry) => (
            <AnswerLogCard entry={entry} key={entry.replyId} />
          ))}
        </ol>
      )}
    </section>
  );
}

export default function MePage() {
  const { status, user } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        {status === "authenticated" && user ? (
          <>
            <section className="space-y-3">
              <p className="text-sm text-muted">내 정보</p>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
                내 기록
              </h1>
              <div className="space-y-1 text-muted">
                <p>{user.email}</p>
                <p className="text-sm">{formatJoinedDate(user.createdAt)} 가입</p>
              </div>
            </section>
            <MyAnswerLogSection />
          </>
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
