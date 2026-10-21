import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
      <div className="flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 온설</p>
        <nav aria-label="서비스 정책 및 문의" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link className="transition hover:text-foreground" href="/terms">이용약관</Link>
          <Link className="font-semibold transition hover:text-foreground" href="/privacy">개인정보처리방침</Link>
          <a className="transition hover:text-foreground" href="mailto:admin@onseol.com">
            문의 admin@onseol.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
