"use client";

import { RequestComposer } from "./components/RequestComposer";
import { RotatingOnseolLine } from "./components/RotatingOnseolLine";
import { useOnseolPrototype } from "./prototype/useOnseolPrototype";

export function TodayPrototype() {
  const prototype = useOnseolPrototype();
  const isTyping = prototype.state.requestDraft.trim().length > 0;
  const requestCount = prototype.state.requests.filter(
    (request) => !request.hidden,
  ).length;
  const replyCount = prototype.state.replies.filter(
    (reply) => !reply.hidden,
  ).length;

  return (
    <main className="flex min-h-screen items-center bg-background px-5 py-10 text-foreground sm:px-8">
      <section className="mx-auto grid w-full max-w-3xl gap-8 text-center">
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
          onSubmit={prototype.submitRequest}
        />

        <p className="text-sm text-muted">
          오늘 {requestCount}개의 이야기가 남겨졌고, {replyCount}개의 답장이
          도착했어요.
        </p>
      </section>
    </main>
  );
}
