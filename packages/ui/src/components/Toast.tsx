"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "../icons";
import type { ToastKind, ToastState } from "../hooks/useToast";

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const Icon = ICONS[kind];

  return (
    <div
      className={`fixed bottom-5 right-5 z-30 flex max-w-sm items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-sm transition duration-200 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      role="status"
    >
      <Icon className={`h-5 w-5 shrink-0 ${ICON_COLORS[kind]}`} />
      <span className="text-foreground">{message}</span>
      <button
        aria-label="알림 닫기"
        className="ml-auto shrink-0 text-lg leading-none text-muted transition hover:text-foreground"
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
