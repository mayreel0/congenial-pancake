import Link from "next/link";
import type { ReactNode } from "react";
import { LandingFooter } from "./landing/LandingFooter";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10 sm:px-8">
        <Link className="text-sm text-primary underline underline-offset-2" href="/">
          온설 홈으로
        </Link>
        <header className="space-y-4">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="rounded-lg border border-line bg-surface-muted p-4 text-sm leading-7">
            이 문서는 초안이며 법률 자문이 아닙니다. 공개 전 별도 확인을 권장합니다.
            시행일과 확인이 필요한 운영 정보는 확정 후 반영합니다.
          </p>
        </header>
        <article className="space-y-8 break-words text-sm leading-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
