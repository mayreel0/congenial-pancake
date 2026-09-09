import { useEffect, useRef, useState } from "react";
import { errorMessage } from "api";

export type ToastKind = "success" | "error" | "warning";
export type ToastState = { kind: ToastKind; message: string } | null;

const TOAST_VISIBLE_MS = 2000;

// Extracted from ReadFeed.tsx/TodayPrototype.tsx's near-identical local
// implementations — one shared place for the state/timer/dismiss logic so
// every consumer (web and admin alike) doesn't reinvent it, and so
// showError always goes through the shared errorMessage() (api package)
// instead of each page hand-rolling its own ERROR_MESSAGES map.
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function show(kind: ToastKind, message: string) {
    setToast({ kind, message });
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, TOAST_VISIBLE_MS);
  }

  function dismiss() {
    setToast(null);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    toast,
    showSuccess: (message: string) => show("success", message),
    showError: (error: unknown) => show("error", errorMessage(error)),
    showWarning: (message: string) => show("warning", message),
    dismiss,
  };
}
