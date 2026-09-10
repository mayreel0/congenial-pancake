import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";

type ActionConfirmDialogProps = {
  open: boolean;
  message: string;
  confirmLabel: string;
  onCancel(): void;
  onConfirm(): void;
};

export function ActionConfirmDialog({
  open,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ActionConfirmDialogProps) {
  const boxRef = useDismissOnOutsideClick<HTMLDivElement>(open, onCancel);
  // Kept mounted for POPOVER_EXIT_MS after `open` goes false so the leave
  // animation can actually play, instead of unmounting instantly.
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);

  if (!shouldRender) return null;

  return (
    <div
      aria-modal="true"
      className={`fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-5 ${
        open
          ? "onseol-dialog-backdrop-enter"
          : "onseol-dialog-backdrop-leave"
      }`}
      role="dialog"
    >
      <div
        className={`w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-5 shadow-sm ${
          open ? "onseol-dialog-box-enter" : "onseol-dialog-box-leave"
        }`}
        ref={boxRef}
      >
        <p className="text-sm leading-6 text-foreground">{message}</p>
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
