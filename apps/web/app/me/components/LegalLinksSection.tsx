import Link from "next/link";

export function LegalLinksSection() {
  return (
    <section
      aria-labelledby="legal-links-heading"
      className="space-y-3 rounded-lg border border-line bg-surface px-4 py-5 shadow-sm"
    >
      <h2 id="legal-links-heading" className="text-sm font-semibold text-foreground">
        약관 및 정책
      </h2>
      <ul className="space-y-1">
        <li>
          <Link
            className="inline-flex min-h-11 items-center rounded text-sm text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/terms"
          >
            이용약관
          </Link>
        </li>
        <li>
          <Link
            className="inline-flex min-h-11 items-center rounded text-sm text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            href="/privacy"
          >
            개인정보처리방침
          </Link>
        </li>
      </ul>
    </section>
  );
}
