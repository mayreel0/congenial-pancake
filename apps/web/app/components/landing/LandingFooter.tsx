export function LandingFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
      <div className="flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 온설</p>
        <a
          className="transition hover:text-foreground"
          href="mailto:hello@onseol.com"
        >
          문의 hello@onseol.com
        </a>
      </div>
    </footer>
  );
}
