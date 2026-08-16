"use client";

import { ActivitySummary } from "./components/ActivitySummary";
import { MyActivityList } from "./components/MyActivityList";
import { NoteCard } from "./components/NoteCard";
import { RecentExchangeList } from "./components/RecentExchangeList";
import { ReplyCard } from "./components/ReplyCard";
import { ReplyComposer } from "./components/ReplyComposer";
import { RequestComposer } from "./components/RequestComposer";
import { getVisibleRepliesForRequest } from "./prototype/model";
import { useOnseolPrototype } from "./prototype/useOnseolPrototype";

export function TodayPrototype() {
  const prototype = useOnseolPrototype();
  const visibleReplyCount = prototype.state.replies.filter(
    (reply) => !reply.hidden,
  ).length;
  const waitingCount = prototype.priorityRequests.filter(
    (request) =>
      getVisibleRepliesForRequest(prototype.state, request.id).length === 0,
  ).length;
  const selectedRequest = prototype.selectedRequest;
  const selectedDraft = selectedRequest
    ? prototype.state.replyDrafts[selectedRequest.id] ?? ""
    : "";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-surface px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">온화하게 나누는 오늘의 한마디</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              온설
            </h1>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
            type="button"
            onClick={prototype.resetPrototype}
          >
            초기화
          </button>
        </div>
      </header>

      <RequestComposer
        value={prototype.state.requestDraft}
        onChange={prototype.updateRequestDraft}
        onSubmit={prototype.submitRequest}
      />

      <ActivitySummary
        requestCount={prototype.priorityRequests.length}
        replyCount={visibleReplyCount}
        waitingCount={waitingCount}
      />

      <div className="mx-auto grid max-w-3xl gap-8 px-5 py-8 sm:px-8">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            답변을 기다리는 말
          </h2>
          {prototype.priorityRequests.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-4 text-sm text-muted">
              지금은 보이는 글이 없습니다. 오늘 있었던 일을 짧게 남겨보세요.
            </p>
          ) : (
            <div className="space-y-3">
              {prototype.priorityRequests.map((request) => {
                const replyCount = getVisibleRepliesForRequest(
                  prototype.state,
                  request.id,
                ).length;

                return (
                  <NoteCard
                    active={selectedRequest?.id === request.id}
                    key={request.id}
                    mine={request.authorId === prototype.state.viewer.id}
                    replyCount={replyCount}
                    request={request}
                    onReport={() => prototype.reportRequest(request.id)}
                    onSelect={() => prototype.selectRequest(request.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {selectedRequest ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-line bg-surface px-4 py-4">
              <h2 className="text-base font-semibold text-foreground">
                선택한 요청
              </h2>
              <p className="mt-3 text-base leading-7 text-foreground">
                {selectedRequest.body}
              </p>
            </div>

            <div className="space-y-3">
              {prototype.selectedReplies.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface px-4 py-4 text-sm text-muted">
                  아직 답변이 없습니다. 첫 답변을 남겨주세요.
                </p>
              ) : (
                prototype.selectedReplies.map((reply) => (
                  <ReplyCard
                    key={reply.id}
                    mine={reply.authorId === prototype.state.viewer.id}
                    reply={reply}
                    onReport={() => prototype.reportReply(reply.id)}
                  />
                ))
              )}
            </div>

            <ReplyComposer
              disabled={prototype.hasViewerRepliedToSelected}
              value={selectedDraft}
              onChange={(value) =>
                prototype.updateReplyDraft(selectedRequest.id, value)
              }
              onSubmit={() => prototype.submitReply(selectedRequest.id)}
            />
          </section>
        ) : null}

        <RecentExchangeList exchanges={prototype.recentExchanges} />
        <MyActivityList
          replies={prototype.myReplies}
          requests={prototype.myRequests}
        />
      </div>
    </main>
  );
}
