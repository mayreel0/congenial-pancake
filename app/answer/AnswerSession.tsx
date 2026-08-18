"use client";

import { useMemo, useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useOnseolPrototype } from "../today/prototype/useOnseolPrototype";
import { AnswerComposer } from "./components/AnswerComposer";
import { AnswerLog } from "./components/AnswerLog";
import { HoldPanel } from "./components/HoldPanel";
import { ReportConfirmDialog } from "./components/ReportConfirmDialog";
import { buildAnonymousLabels } from "./prototype/labels";

export function AnswerSession() {
  const prototype = useOnseolPrototype();
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

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

  function confirmReport() {
    if (pendingReportId) prototype.reportRequest(pendingReportId);
    setPendingReportId(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <ServiceNav activePath="/answer" />
      <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col">
        <AnswerLog
          authorLabels={authorLabels}
          currentRequest={currentTarget}
          entries={prototype.answerLog}
          onHold={prototype.holdRequest}
          onReport={setPendingReportId}
          onSkip={prototype.skipRequest}
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
        <div className="flex items-center justify-between border-t border-line px-5 pt-2 sm:px-8">
          <button
            className="text-xs font-medium text-muted transition hover:text-foreground"
            type="button"
            onClick={() => setHoldPanelOpen((open) => !open)}
          >
            보류 중 ({prototype.heldRequests.length})
          </button>
        </div>
        <AnswerComposer
          disabled={!currentTarget}
          isAnsweringHeldRequest={prototype.isAnsweringHeldRequest}
          value={draft}
          onCancelHeld={prototype.closeHeldRequest}
          onChange={(value) =>
            currentTarget && prototype.updateReplyDraft(currentTarget.id, value)
          }
          onSubmit={() =>
            currentTarget && prototype.submitReply(currentTarget.id)
          }
        />
      </div>
      <ReportConfirmDialog
        open={pendingReportId !== null}
        onCancel={() => setPendingReportId(null)}
        onConfirm={confirmReport}
      />
    </div>
  );
}
