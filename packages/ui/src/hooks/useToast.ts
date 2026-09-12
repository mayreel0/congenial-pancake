import { useEffect, useState } from "react";
import { errorMessage } from "api";

export type ToastKind = "success" | "error" | "warning";
export type ToastState = { kind: ToastKind; message: string } | null;

const TOAST_VISIBLE_MS = 2000;

// Module-level (not per-component) state — every earlier version of this
// mounted its own useToast()+<Toast> pair per page/dialog, which meant (a)
// navigating away mid-toast unmounted the state and timer with the page,
// cutting the toast off, and (b) non-component code (apiFetch, a plain
// function) had no hook to call in the first place. A single shared store
// with one root-mounted <GlobalToast/> (see components/GlobalToast.tsx)
// fixes both — every call site now just imports the `toast` object below
// instead of calling a hook and rendering its own <Toast>.
let currentToast: ToastState = null;
let dismissTimer: number | null = null;
const listeners = new Set<(state: ToastState) => void>();

function setState(next: ToastState) {
  currentToast = next;
  listeners.forEach((listener) => listener(currentToast));
}

function show(kind: ToastKind, message: string) {
  setState({ kind, message });
  if (dismissTimer !== null) window.clearTimeout(dismissTimer);
  dismissTimer = window.setTimeout(() => {
    setState(null);
    dismissTimer = null;
  }, TOAST_VISIBLE_MS);
}

function dismiss() {
  setState(null);
  if (dismissTimer !== null) {
    window.clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

// Imperative API — call from any component or plain function, with no
// hook/render tree requirement. Named `toast` (not `showToast` etc.) to
// match the `toast.success(...)`/`toast.error(...)` shape most toast
// libraries already use.
export const toast = {
  success: (message: string) => show("success", message),
  error: (error: unknown) => show("error", errorMessage(error)),
  warning: (message: string) => show("warning", message),
  dismiss,
};

// For GlobalToast (the one place that actually renders the toast UI) to
// subscribe to the shared state — not exported for general use the way
// `toast` is, since nothing else needs to read the current toast, only
// set it.
export function useToastState(): ToastState {
  // The initial value already covers a toast set before this ever renders
  // (currentToast is read fresh at that point) — the effect below only
  // needs to subscribe for updates from here on, not re-sync state itself
  // (that would be a synchronous setState-in-effect).
  const [state, setLocalState] = useState<ToastState>(currentToast);

  useEffect(() => {
    listeners.add(setLocalState);
    return () => {
      listeners.delete(setLocalState);
    };
  }, []);

  return state;
}
