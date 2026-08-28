"use client";

import { useMemo, useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useAnswerQueue } from "./useAnswerQueue";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";
import { AnswerComposer } from "./components/AnswerComposer";
import { AnswerLog } from "./components/AnswerLog";
import { HoldPanel } from "./components/HoldPanel";
import { buildAnonymousLabels } from "./labels";

const BUBBLE_LEAVE_MS = 180;

type PendingActionType = "report" | "skip" | "hold";

type PendingAction = {
  type: PendingActionType;
  requestId: string;
};

const ACTION_CONFIRM_COPY: Record<
  PendingActionType,
  { message: string; confirmLabel: string }
> = {
  report: {
    message: "이 온설을 신고할까요? 신고하면 이 글은 답하기 목록에서 사라집니다.",
    confirmLabel: "신고하기",
  },
  skip: {
    message: "이 글을 넘길까요? 넘기면 답하기 목록에서 다시 보이지 않습니다.",
    confirmLabel: "넘기기",
  },
  hold: {
    message:
      "이 온설을 보류할까요? 보류하면 보류함으로 옮겨지고, 나중에 다시 답할 수 있어요.",
    confirmLabel: "보류하기",
  },
};

export function AnswerSession() {
  const prototype = useAnswerQueue();
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [leavingRequestId, setLeavingRequestId] = useState<string | null>(
    null,
  );
  const [loadingNext, setLoadingNext] = useState(false);
  const [answerSubmitStatus, setAnswerSubmitStatus] = useState<
    "idle" | "pending"
  >("idle");

  const currentTarget = prototype.currentAnswerTarget;
  const draft = currentTarget
    ? (prototype.replyDrafts[currentTarget.id] ?? "")
    : "";
  const isTyping =
    Boolean(currentTarget) &&
    draft.trim().length > 0 &&
    answerSubmitStatus === "idle" &&
    !loadingNext;

  const authorLabels = useMemo(() => {
    const orderedRequests = [
      ...prototype.answerLog.map((entry) => entry.request),
      ...(currentTarget ? [currentTarget] : []),
    ];
    return buildAnonymousLabels(orderedRequests);
  }, [prototype.answerLog, currentTarget]);

  function runWithLeaveAnimation(requestId: string, action: () => Promise<void>) {
    setLeavingRequestId(requestId);
    window.setTimeout(async () => {
      setLeavingRequestId((current) =>
        current === requestId ? null : current,
      );
      setLoadingNext(true);
      try {
        await action();
      } finally {
        setLoadingNext(false);
      }
    }, BUBBLE_LEAVE_MS);
  }

  function requestAction(type: PendingActionType, requestId: string) {
    setPendingAction({ type, requestId });
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const { type, requestId } = pendingAction;
    setPendingAction(null);

    runWithLeaveAnimation(requestId, async () => {
      if (type === "report") await prototype.reportRequest(requestId);
      if (type === "skip") await prototype.skipRequest(requestId);
      if (type === "hold") await prototype.holdRequest(requestId);
    });
  }

  async function handleSubmit() {
    if (!currentTarget || answerSubmitStatus === "pending") return;

    setAnswerSubmitStatus("pending");
    try {
      await prototype.submitReply(currentTarget.id);
    } finally {
      setAnswerSubmitStatus("idle");
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <ServiceNav activePath="/answer" />
      <div className="flex min-h-0 flex-1 flex-col">
        <AnswerLog
          authorLabels={authorLabels}
          canManageCurrentRequest={prototype.canManageCurrentRequest}
          currentRequest={currentTarget}
          entries={prototype.answerLog}
          isTyping={isTyping}
          leavingRequestId={leavingRequestId}
          loadingNext={loadingNext}
          onHold={(requestId) => requestAction("hold", requestId)}
          onReport={(requestId) => requestAction("report", requestId)}
          onSkip={(requestId) => requestAction("skip", requestId)}
        />
        <div className="relative border-t border-line px-5 pt-2 sm:px-8">
          <HoldPanel
            heldRequests={prototype.heldRequests}
            open={holdPanelOpen}
            onClose={() => setHoldPanelOpen(false)}
            onSelect={(requestId) => {
              prototype.openHeldRequest(requestId);
              setHoldPanelOpen(false);
            }}
          />
          {prototype.canManageCurrentRequest ? (
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
              <button
                className="text-xs font-medium text-muted transition hover:text-foreground"
                type="button"
                onClick={() => setHoldPanelOpen((open) => !open)}
              >
                보류 중 ({prototype.heldRequests.length})
              </button>
            </div>
          ) : null}
        </div>
        <AnswerComposer
          anonymous={prototype.anonymous}
          disabled={!currentTarget || loadingNext}
          isAnsweringHeldRequest={prototype.isAnsweringHeldRequest}
          nickname={prototype.nickname}
          pending={answerSubmitStatus === "pending"}
          value={draft}
          onCancelHeld={prototype.closeHeldRequest}
          onChange={(value) =>
            currentTarget && prototype.updateReplyDraft(currentTarget.id, value)
          }
          onSubmit={handleSubmit}
          onToggleAnonymous={prototype.toggleAnonymous}
        />
      </div>
      <ActionConfirmDialog
        confirmLabel={
          pendingAction ? ACTION_CONFIRM_COPY[pendingAction.type].confirmLabel : ""
        }
        message={
          pendingAction ? ACTION_CONFIRM_COPY[pendingAction.type].message : ""
        }
        open={pendingAction !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
