"use client";

import { useMemo, useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useOnseolPrototype } from "../today/prototype/useOnseolPrototype";
import { ActionConfirmDialog } from "./components/ActionConfirmDialog";
import { AnswerComposer } from "./components/AnswerComposer";
import { AnswerLog } from "./components/AnswerLog";
import { HoldPanel } from "./components/HoldPanel";
import { buildAnonymousLabels } from "./prototype/labels";

const BUBBLE_LEAVE_MS = 180;
const ANSWER_SUBMIT_PENDING_MS = 450;

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
    message:
      "이 온설을 스킵할까요? 스킵하면 이 글은 답하기 목록에서 다시 보이지 않습니다.",
    confirmLabel: "스킵하기",
  },
  hold: {
    message:
      "이 온설을 보류할까요? 보류하면 보류함으로 옮겨지고, 나중에 다시 답할 수 있어요.",
    confirmLabel: "보류하기",
  },
};

export function AnswerSession() {
  const prototype = useOnseolPrototype();
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [leavingRequestId, setLeavingRequestId] = useState<string | null>(
    null,
  );
  const [answerSubmitStatus, setAnswerSubmitStatus] = useState<
    "idle" | "pending"
  >("idle");

  const currentTarget = prototype.currentAnswerTarget;
  const draft = currentTarget
    ? (prototype.state.replyDrafts[currentTarget.id] ?? "")
    : "";

  const authorLabels = useMemo(() => {
    const orderedRequests = [
      ...prototype.answerLog.map((entry) => entry.request),
      ...(currentTarget ? [currentTarget] : []),
    ];
    return buildAnonymousLabels(orderedRequests);
  }, [prototype.answerLog, currentTarget]);

  function runWithLeaveAnimation(requestId: string, action: () => void) {
    setLeavingRequestId(requestId);
    window.setTimeout(() => {
      action();
      setLeavingRequestId((current) =>
        current === requestId ? null : current,
      );
    }, BUBBLE_LEAVE_MS);
  }

  function requestAction(type: PendingActionType, requestId: string) {
    setPendingAction({ type, requestId });
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const { type, requestId } = pendingAction;
    setPendingAction(null);

    runWithLeaveAnimation(requestId, () => {
      if (type === "report") prototype.reportRequest(requestId);
      if (type === "skip") prototype.skipRequest(requestId);
      if (type === "hold") prototype.holdRequest(requestId);
    });
  }

  async function handleSubmit() {
    if (!currentTarget || answerSubmitStatus === "pending") return;

    setAnswerSubmitStatus("pending");
    await new Promise((resolve) =>
      window.setTimeout(resolve, ANSWER_SUBMIT_PENDING_MS),
    );
    prototype.submitReply(currentTarget.id);
    setAnswerSubmitStatus("idle");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <ServiceNav activePath="/answer" />
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col">
        <AnswerLog
          authorLabels={authorLabels}
          currentRequest={currentTarget}
          entries={prototype.answerLog}
          leavingRequestId={leavingRequestId}
          onHold={(requestId) => requestAction("hold", requestId)}
          onReport={(requestId) => requestAction("report", requestId)}
          onSkip={(requestId) => requestAction("skip", requestId)}
        />
        <HoldPanel
          heldRequests={prototype.heldRequests}
          open={holdPanelOpen}
          onClose={() => setHoldPanelOpen(false)}
          onSelect={(requestId) => {
            prototype.openHeldRequest(requestId);
            setHoldPanelOpen(false);
          }}
        />
        <div className="border-t border-line px-5 pt-2 sm:px-8">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
            <button
              className="text-xs font-medium text-muted transition hover:text-foreground"
              type="button"
              onClick={() => setHoldPanelOpen((open) => !open)}
            >
              보류 중 ({prototype.heldRequests.length})
            </button>
          </div>
        </div>
        <AnswerComposer
          disabled={!currentTarget}
          isAnsweringHeldRequest={prototype.isAnsweringHeldRequest}
          pending={answerSubmitStatus === "pending"}
          value={draft}
          onCancelHeld={prototype.closeHeldRequest}
          onChange={(value) =>
            currentTarget && prototype.updateReplyDraft(currentTarget.id, value)
          }
          onSubmit={handleSubmit}
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
