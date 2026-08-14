export function EntryActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 whitespace-nowrap"
        type="button"
        aria-disabled="true"
      >
        웹에서 시작하기
      </button>
      <button
        className="inline-flex h-12 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-foreground whitespace-nowrap"
        type="button"
        disabled
      >
        앱으로 이용하기 · 준비 중
      </button>
    </div>
  );
}
