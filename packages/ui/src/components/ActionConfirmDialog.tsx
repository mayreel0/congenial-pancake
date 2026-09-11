import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import {
  POPOVER_EXIT_MS,
  useAnimatedPresence,
} from "../hooks/useAnimatedPresence";
import {
  BUTTON_PENDING_MIN_MS,
  useMinDisplayDuration,
} from "../hooks/useMinDisplayDuration";
import { Button } from "./Button";

type ActionConfirmDialogProps = {
  open: boolean;
  message: string;
  confirmLabel: string;
  // Optional — most callers fire a quick, effectively-synchronous action
  // (report/delete/restore) with no tracked pending state. Callers that do
  // have one (e.g. a save that hits the network) pass it so the confirm
  // button shows a spinner and disables itself instead of allowing a
  // double-click mid-request.
  pending?: boolean;
  onCancel(): void;
  onConfirm(): void;
};

export function ActionConfirmDialog({
  open,
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: ActionConfirmDialogProps) {
  const boxRef = useDismissOnOutsideClick<HTMLDivElement>(open, onCancel);
  // Kept mounted for POPOVER_EXIT_MS after `open` goes false so the leave
  // animation can actually play, instead of unmounting instantly.
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);
  const showSpinner = useMinDisplayDuration(
    pending ?? false,
    BUTTON_PENDING_MIN_MS,
  );

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
          <Button
            disabled={pending || showSpinner}
            size="sm"
            variant="ghost"
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            disabled={pending || showSpinner}
            pending={showSpinner}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
