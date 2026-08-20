type DateDividerProps = {
  label: string;
};

export function DateDivider({ label }: DateDividerProps) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-muted" role="separator">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span suppressHydrationWarning>{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
