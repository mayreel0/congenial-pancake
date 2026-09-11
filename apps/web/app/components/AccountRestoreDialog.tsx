"use client";

import { useState } from "react";
import { Button } from "ui/Button";
import { Toast } from "ui/Toast";
import { useToast } from "ui/useToast";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { BUTTON_PENDING_MIN_MS, useMinDisplayDuration } from "ui/useMinDisplayDuration";
import { useAuth } from "../lib/auth/useAuth";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A plain function, not inlined in the component body — Date.now() is an
// impure read, and calling it directly during render trips
// react-hooks/purity (same reason app/lib/format.ts's date helpers take
// `now` as a parameter rather than reading it inline).
function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - now.getTime()) / MS_PER_DAY),
  );
}

// Mounted once in the root layout so it appears no matter which page a
// pending-deletion login lands on — GET /auth/me's deletionGracePeriodEndsAt
// is the single source of truth this gates on, so no page needs its own
// special-case check. Deliberately no backdrop-dismiss (unlike
// ui/ActionConfirmDialog) — "로그아웃" has a real side effect, so a stray
// click outside the dialog shouldn't trigger it the way a plain cancel
// action safely could elsewhere.
export function AccountRestoreDialog() {
  const { user, restoreAccount, logout } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { toast, showError, dismiss } = useToast();
  const open = Boolean(user?.deletionGracePeriodEndsAt);
  // `open` goes false once the account is restored, clearing
  // `deletionGracePeriodEndsAt`.
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);
  const showLogoutSpinner = useMinDisplayDuration(
    loggingOut,
    BUTTON_PENDING_MIN_MS,
  );
  const showRestoreSpinner = useMinDisplayDuration(
    restoring,
    BUTTON_PENDING_MIN_MS,
  );

  if (!shouldRender) return null;

  const daysRemaining = user?.deletionGracePeriodEndsAt
    ? daysUntil(user.deletionGracePeriodEndsAt)
    : 0;

  async function handleRestore(): Promise<void> {
    setRestoring(true);
    try {
      await restoreAccount();
    } catch (error) {
      showError(error);
    } finally {
      setRestoring(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      showError(error);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-5 ${
        open ? "onseol-dialog-backdrop-enter" : "onseol-dialog-backdrop-leave"
      }`}
      role="dialog"
    >
      <div
        className={`w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-5 shadow-sm ${
          open ? "onseol-dialog-box-enter" : "onseol-dialog-box-leave"
        }`}
      >
        <p className="text-sm leading-6 text-foreground">
          탈퇴 신청 중인 계정이에요. {daysRemaining}일 후 완전히 삭제됩니다.
          계속 이용하려면 계정을 복구해주세요.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            disabled={restoring || showLogoutSpinner}
            pending={showLogoutSpinner}
            size="sm"
            variant="ghost"
            onClick={() => void handleLogout()}
          >
            로그아웃
          </Button>
          <Button
            disabled={loggingOut || showRestoreSpinner}
            pending={showRestoreSpinner}
            size="sm"
            onClick={() => void handleRestore()}
          >
            복구하기
          </Button>
        </div>
      </div>
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
