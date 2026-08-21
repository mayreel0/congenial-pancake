"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { RequestComposer } from "./components/RequestComposer";
import { RotatingOnseolLine } from "./components/RotatingOnseolLine";
import { useTodayComposer } from "./useTodayComposer";

const TOAST_VISIBLE_MS = 2000;

const ERROR_MESSAGES: Record<string, string> = {
  REQUEST_GUEST_LIMIT_EXCEEDED: "비회원은 온설을 1개만 남길 수 있어요. 로그인하면 더 남길 수 있어요.",
  GUEST_ID_REQUIRED: "요청을 남기지 못했어요. 잠시 후 다시 시도해주세요.",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? "요청을 남기지 못했어요. 잠시 후 다시 시도해주세요.";
  }
  return "요청을 남기지 못했어요. 잠시 후 다시 시도해주세요.";
}

export function TodayPrototype() {
  const prototype = useTodayComposer();
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );
  const toastTimerRef = useRef<number | null>(null);
  const isTyping = prototype.requestDraft.trim().length > 0;
  const requestCount = prototype.requestCount;
  const replyCount = prototype.replyCount;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(next: { kind: "success" | "error"; message: string }) {
    setToast(next);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_VISIBLE_MS);
  }

  const submitRequest = async (body: string) => {
    try {
      await prototype.submitRequest(body);
      showToast({ kind: "success", message: "온설을 남겼어요" });
    } catch (error) {
      showToast({ kind: "error", message: errorMessage(error) });
    }
  };

  const dismissToast = () => {
    setToast(null);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/today" />
      <main className="flex min-h-[calc(100dvh-3.5rem-1px)] px-5 py-10 sm:items-center sm:px-8">
        <section
          className="mx-auto grid min-h-[calc(100dvh-8.5rem-1px)] w-full max-w-3xl grid-rows-[1fr_auto_auto] gap-7 text-center sm:min-h-0 sm:grid-rows-none sm:gap-8"
          data-testid="today-entry-layout"
        >
          <div
            className="self-center space-y-4 sm:self-auto"
            data-testid="today-entry-copy"
          >
            <p className="text-sm text-muted">온설</p>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
              오늘 어떤 말을 듣고 싶나요?
            </h1>
            <RotatingOnseolLine
              messages={prototype.todayEntryMessages}
              paused={isTyping}
            />
          </div>

          <div
            className="self-end sm:self-auto"
            data-testid="today-entry-composer"
          >
            <RequestComposer
              status={prototype.requestSubmitStatus}
              value={prototype.requestDraft}
              onChange={prototype.updateRequestDraft}
              onSubmit={submitRequest}
            />
          </div>

          <p className="text-sm text-muted">
            오늘 {requestCount}개의 이야기가 남겨졌고, {replyCount}개의 답장이
            도착했어요.
          </p>
        </section>
      </main>
      {toast ? (
        <div
          className="fixed bottom-5 left-1/2 z-10 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-sm sm:bottom-8 sm:w-auto sm:min-w-64"
          role="status"
        >
          <span className={toast.kind === "error" ? "text-red-600" : "text-foreground"}>
            {toast.message}
          </span>
          <button
            aria-label="알림 닫기"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={dismissToast}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
