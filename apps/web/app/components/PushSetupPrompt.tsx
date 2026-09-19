"use client";

import { useEffect, useState } from "react";
import { Button } from "ui/Button";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { BUTTON_PENDING_MIN_MS, useMinDisplayDuration } from "ui/useMinDisplayDuration";
import { toast } from "ui/useToast";
import { useAuth } from "../lib/auth/useAuth";
import {
  enablePushNotifications,
  getOwnPushSubscription,
  isStandaloneApp,
  pushErrorMessage,
  pushSupported,
} from "../lib/notifications/push";

const PROMPTED_KEY = "onseol.pushPrompted";

// Per device, not per account — one ask per install is enough. If storage is
// unavailable, treat it as already asked rather than nagging on every load.
function wasPrompted(): boolean {
  try {
    return localStorage.getItem(PROMPTED_KEY) === "1";
  } catch {
    return true;
  }
}

function markPrompted(): void {
  try {
    localStorage.setItem(PROMPTED_KEY, "1");
  } catch {
    // Nothing to persist to; wasPrompted() already errs toward not asking.
  }
}

// Mounted once in the root layout: asks once, in the installed app, after
// login, whether to turn push on. Covers installing while logged out and
// logging in later, since it keys off the login state rather than the
// install moment. The browser's own permission popup only appears once
// "켜기" is pressed here.
export function PushSetupPrompt() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);
  const showSpinner = useMinDisplayDuration(pending, BUTTON_PENDING_MIN_MS);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isStandaloneApp() || !pushSupported() || wasPrompted()) return;
    if (Notification.permission === "denied") return;

    let cancelled = false;
    getOwnPushSubscription()
      .then((subscription) => {
        if (!cancelled && subscription === null) setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status]);

  function handleLater() {
    markPrompted();
    setOpen(false);
  }

  // Only a successful enable closes the dialog and uses up the one-time ask;
  // a refused permission popup or a failed request keeps it open so the
  // viewer can retry or pick "나중에".
  async function handleEnable() {
    setPending(true);
    try {
      await enablePushNotifications();
      markPrompted();
      setOpen(false);
    } catch (error) {
      toast.warning(pushErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (!shouldRender) return null;

  // No backdrop-dismiss — a stray tap outside shouldn't use up the one-time ask.
  return (
    <div
      aria-label="알림 설정 안내"
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
          답장이 오면 알려드릴까요? 알림에는 &ldquo;답장이 도착했어요&rdquo;
          문구만 담기고, 답장 내용은 들어가지 않아요. 설정에서 언제든 바꿀 수
          있어요.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            disabled={showSpinner}
            size="sm"
            variant="ghost"
            onClick={handleLater}
          >
            나중에
          </Button>
          <Button
            disabled={showSpinner}
            pending={showSpinner}
            size="sm"
            onClick={() => void handleEnable()}
          >
            켜기
          </Button>
        </div>
      </div>
    </div>
  );
}
