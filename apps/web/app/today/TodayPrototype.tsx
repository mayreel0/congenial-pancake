"use client";

import { ServiceNav } from "../components/navigation/ServiceNav";
import { Skeleton } from "ui/Skeleton";
import { toast } from "ui/useToast";
import { RequestComposer } from "./components/RequestComposer";
import { RotatingOnseolLine } from "./components/RotatingOnseolLine";
import { useTodayComposer } from "./useTodayComposer";

export function TodayPrototype() {
  const prototype = useTodayComposer();
  const isTyping = prototype.requestDraft.trim().length > 0;
  const requestCount = prototype.requestCount;
  const replyCount = prototype.replyCount;

  const submitRequest = async (body: string) => {
    try {
      await prototype.submitRequest(body);
      toast.success("온설을 남겼어요");
    } catch (error) {
      toast.error(error);
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
            {prototype.isLoadingEntryMessages ? (
              // h-14 wrapper matches RotatingOnseolLine's own min-h-14 (it
              // reserves room for up to 2 lines so rotating between a short
              // and a long message doesn't jitter) — only the visible bar
              // inside is sized like a single line, so leaving the skeleton
              // doesn't grow the layout despite looking appropriately small.
              <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-center">
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : (
              <RotatingOnseolLine
                messages={prototype.todayEntryMessages}
                paused={isTyping}
              />
            )}
          </div>

          <div
            className="self-end sm:self-auto"
            data-testid="today-entry-composer"
          >
            <RequestComposer
              anonymous={prototype.anonymous}
              isLoadingNickname={prototype.isLoadingNickname}
              nickname={prototype.nickname}
              status={prototype.requestSubmitStatus}
              value={prototype.requestDraft}
              onChange={prototype.updateRequestDraft}
              onSubmit={submitRequest}
              onToggleAnonymous={prototype.toggleAnonymous}
            />
          </div>

          {prototype.isLoadingEntryMessages ? (
            <Skeleton className="mx-auto h-5 w-64" />
          ) : (
            <p className="text-sm text-muted">
              오늘 {requestCount}개의 이야기가 남겨졌고, {replyCount}개의 답장이
              도착했어요.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
