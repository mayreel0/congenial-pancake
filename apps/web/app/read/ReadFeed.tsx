"use client";

import { useMemo, useState } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { useReadFeed } from "../today/prototype/useReadFeed";
import { ActionConfirmDialog } from "../components/shared/ActionConfirmDialog";
import { ReadThread } from "./components/ReadThread";
import { buildReadAuthorLabels } from "./prototype/labels";

type PendingReport =
  | { kind: "request"; requestId: string }
  | { kind: "reply"; requestId: string; replyId: string };

export function ReadFeed() {
  const prototype = useReadFeed();
  const [pendingReport, setPendingReport] = useState<PendingReport | null>(
    null,
  );

  const savedSet = useMemo(
    () => new Set(prototype.savedReplyIds),
    [prototype.savedReplyIds],
  );
  const authorLabels = useMemo(
    () => buildReadAuthorLabels(prototype.readFeed),
    [prototype.readFeed],
  );

  function confirmPendingReport() {
    if (!pendingReport) return;

    if (pendingReport.kind === "request") {
      prototype.reportRequest(pendingReport.requestId);
    } else {
      prototype.reportReply(pendingReport.replyId);
    }

    setPendingReport(null);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/read" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-10 sm:px-8">
        {prototype.readFeed.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            아직 읽을 수 있는 온설이 없어요.
          </p>
        ) : (
          prototype.readFeed.map((item) => (
            <ReadThread
              authorLabels={authorLabels}
              item={item}
              key={item.request.id}
              savedReplyIds={savedSet}
              onReportReply={(replyId) =>
                setPendingReport({
                  kind: "reply",
                  requestId: item.request.id,
                  replyId,
                })
              }
              onReportRequest={() =>
                setPendingReport({ kind: "request", requestId: item.request.id })
              }
              onToggleSaveReply={(replyId) =>
                prototype.toggleSavedReply(replyId)
              }
            />
          ))
        )}
      </main>
      <ActionConfirmDialog
        confirmLabel="신고하기"
        message={
          pendingReport?.kind === "reply"
            ? "이 답변을 신고할까요? 신고하면 이 답변은 더 이상 보이지 않아요."
            : "이 온설을 신고할까요? 신고하면 이 글은 읽기 목록에서 사라집니다."
        }
        open={pendingReport !== null}
        onCancel={() => setPendingReport(null)}
        onConfirm={confirmPendingReport}
      />
    </div>
  );
}
