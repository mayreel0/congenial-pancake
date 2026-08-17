"use client";

import { useEffect, useRef, useState } from "react";
import { RequestComposer } from "./components/RequestComposer";
import { RotatingOnseolLine } from "./components/RotatingOnseolLine";
import { useOnseolPrototype } from "./prototype/useOnseolPrototype";

const TOAST_VISIBLE_MS = 2000;

export function TodayPrototype() {
  const prototype = useOnseolPrototype();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const isTyping = prototype.state.requestDraft.trim().length > 0;
  const requestCount = prototype.state.requests.filter(
    (request) => !request.hidden,
  ).length;
  const replyCount = prototype.state.replies.filter(
    (reply) => !reply.hidden,
  ).length;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const submitRequest = async () => {
    await prototype.submitRequest();
    setShowSuccessToast(true);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setShowSuccessToast(false);
      toastTimerRef.current = null;
    }, TOAST_VISIBLE_MS);
  };

  const dismissSuccessToast = () => {
    setShowSuccessToast(false);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  return (
    <main className="flex min-h-screen bg-background px-5 py-10 text-foreground sm:items-center sm:px-8">
      <section
        className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-3xl content-end gap-7 text-center sm:min-h-0 sm:content-center sm:gap-8"
        data-testid="today-entry-layout"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">온설</p>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
            오늘 어떤 말을 듣고 싶나요?
          </h1>
          <RotatingOnseolLine
            messages={prototype.todayEntryMessages}
            paused={isTyping}
          />
        </div>

        <RequestComposer
          status={prototype.requestSubmitStatus}
          value={prototype.state.requestDraft}
          onChange={prototype.updateRequestDraft}
          onSubmit={submitRequest}
        />

        <p className="text-sm text-muted">
          오늘 {requestCount}개의 이야기가 남겨졌고, {replyCount}개의 답장이
          도착했어요.
        </p>
      </section>
      {showSuccessToast ? (
        <div
          className="fixed bottom-5 left-1/2 z-10 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-foreground shadow-sm sm:bottom-8 sm:w-auto sm:min-w-64"
          role="status"
        >
          <span>온설을 남겼어요</span>
          <button
            aria-label="알림 닫기"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={dismissSuccessToast}
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  );
}
