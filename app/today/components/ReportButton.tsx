type ReportButtonProps = {
  label: string;
  ariaLabel?: string;
  onReport(): void;
};

export function ReportButton({ label, ariaLabel, onReport }: ReportButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
      type="button"
      onClick={onReport}
    >
      {label}
    </button>
  );
}
