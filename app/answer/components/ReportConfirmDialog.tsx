type ReportConfirmDialogProps = {
  open: boolean;
  onCancel(): void;
  onConfirm(): void;
};

export function ReportConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: ReportConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-5"
      role="dialog"
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm leading-6 text-foreground">
          이 온설을 신고할까요? 신고하면 이 글은 답하기 목록에서 사라집니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted transition hover:bg-surface-muted"
            type="button"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            type="button"
            onClick={onConfirm}
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
}
