import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <div className="space-y-3">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            로그인
          </h1>
          <p className="max-w-xl leading-7 text-muted">
            로그인 방식은 인증 스펙에서 확정합니다.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          href="/today"
        >
          비회원으로 계속하기
        </Link>
      </section>
    </main>
  );
}
