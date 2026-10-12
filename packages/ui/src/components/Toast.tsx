"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useMobileToastSwipe } from "../hooks/useMobileToastSwipe";
import {
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "../icons";
import type { ToastKind, ToastState } from "../hooks/useToast";
import "./Toast.css";

type ToastProps = {
  toast: ToastState;
  onDismiss(): void;
};

const ICONS: Record<ToastKind, ComponentType<{ className?: string }>> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: WarningCircleIcon,
};

const ICON_COLORS: Record<ToastKind, string> = {
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-amber-500",
};

type ToastCardProps = {
  kind: ToastKind;
  message: string;
  onDismiss(): void;
};

// A fresh instance (forced by Toast's `key={toast.message + toast.kind}`
// below) mounts with visible=false and flips true on its own next frame —
// keying-to-remount instead of resetting state inside an effect avoids a
// synchronous setState-in-effect (react-hooks/set-state-in-effect).
function ToastCard({ kind, message, onDismiss }: ToastCardProps) {
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useMobileToastSwipe(cardRef, onDismiss);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const Icon = ICONS[kind];

  return (
    <div
      ref={cardRef}
      className={`onseol-toast fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-30 flex max-h-[calc(100dvh-2rem)] items-start gap-3 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface px-4 py-2 sm:py-3 text-base leading-6 shadow-sm transition duration-200 max-sm:[touch-action:pan-y_pinch-zoom] motion-reduce:transition-none sm:bottom-5 sm:left-auto sm:right-5 sm:max-h-none sm:max-w-sm sm:items-center sm:overflow-visible sm:text-sm sm:leading-5 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      role="status"
    >
      <Icon className={`h-5 w-5 shrink-0 max-sm:mt-3 ${ICON_COLORS[kind]}`} />
      <span className="min-w-0 break-words text-foreground max-sm:py-2.5">{message}</span>
      <button
        aria-label="알림 닫기"
        className="ml-auto flex min-h-11 min-w-11 shrink-0 self-center items-center justify-center rounded-lg text-2xl leading-none text-[color:var(--toast-close,var(--muted))] transition hover:text-foreground sm:min-h-0 sm:min-w-0 sm:text-lg"
        type="button"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

// Bottom-right, one shared implementation replacing ReadFeed.tsx's and
// TodayPrototype.tsx's near-duplicate local toasts (see docs/decisions —
// program-wide UX audit, 2026-09-09). Kept to a simple mount-triggered
// fade+slide rather than a full transition system — principle 5 of that
// same audit (expand/collapse transitions) revisits this alongside 8
// other components, so this isn't the place to invent a one-off pattern.
export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  return (
    <ToastCard
      key={`${toast.kind}:${toast.message}`}
      kind={toast.kind}
      message={toast.message}
      onDismiss={onDismiss}
    />
  );
}
