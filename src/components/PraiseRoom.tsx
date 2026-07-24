"use client";

import { useEffect, useRef, useState } from "react";
import { createPostSocket } from "@/lib/socket-client";

type ReportTargetType = "POST" | "COMMENT";
type ReportStatus = "idle" | "submitting" | "accepted" | "error";

type PraiseRoomProps = {
  post: {
    id: string;
    title: string;
    body: string;
    comments: Array<{
      id: string;
      body: string;
      isAiGenerated: boolean;
      displayMode: "NICKNAME" | "ANONYMOUS";
      author: { nickname: string } | null;
    }>;
  };
};

function commenterName(comment: PraiseRoomProps["post"]["comments"][number]): string {
  if (comment.isAiGenerated) return "칭찬러";
  if (comment.displayMode === "ANONYMOUS") return "익명";
  return comment.author?.nickname ?? "익명";
}

function reportKey(targetType: ReportTargetType, targetId: string) {
  return `${targetType}:${targetId}`;
}

export default function PraiseRoom({ post }: PraiseRoomProps) {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null);
  const [reportStatuses, setReportStatuses] = useState<Record<string, ReportStatus>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setIsReady(true);
    const socket = createPostSocket(post.id);
    socket.on("post:event", () => {
      window.location.reload();
    });
    return () => {
      socket.disconnect();
    };
  }, [post.id]);

  async function createComment() {
    const form = formRef.current;
    if (!form?.reportValidity()) return;
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(form);
    const response = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: String(formData.get("body") ?? ""),
        displayMode: String(formData.get("displayMode") ?? "NICKNAME")
      })
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    setIsSubmitting(false);
    setError(`칭찬을 남기지 못했습니다. 다시 시도해주세요. (${response.status})`);
  }

  async function submitReport(targetType: ReportTargetType, targetId: string, formData: FormData) {
    const key = reportKey(targetType, targetId);
    const reason = String(formData.get("reason") ?? "").trim();
    if (!reason) return;

    setReportStatuses((current) => ({ ...current, [key]: "submitting" }));
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason })
    });

    if (response.ok) {
      setReportStatuses((current) => ({ ...current, [key]: "accepted" }));
      setActiveReportKey(null);
      return;
    }

    setReportStatuses((current) => ({ ...current, [key]: "error" }));
  }

  function renderReportControls(targetType: ReportTargetType, targetId: string) {
    const key = reportKey(targetType, targetId);
    const status = reportStatuses[key] ?? "idle";
    const isActive = activeReportKey === key;

    return (
      <div>
        {status === "accepted" ? <p role="status">신고가 접수되었습니다</p> : null}
        {status === "error" ? <p role="alert">신고를 접수하지 못했습니다. 다시 시도해주세요.</p> : null}
        {isActive ? (
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitReport(targetType, targetId, new FormData(event.currentTarget));
            }}
          >
            <label>
              신고 사유
              <textarea name="reason" maxLength={500} required />
            </label>
            <button type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "접수 중..." : "신고 접수"}
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setActiveReportKey(key)}>
            신고하기
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="page-section">
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      {renderReportControls("POST", post.id)}
      <form ref={formRef} className="settings-form">
        <label>
          칭찬 댓글
          <textarea name="body" maxLength={1000} required />
        </label>
        <label>
          표시 방식
          <select name="displayMode" defaultValue="NICKNAME">
            <option value="NICKNAME">닉네임</option>
            <option value="ANONYMOUS">익명</option>
          </select>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="button" disabled={isSubmitting || !isReady} onClick={createComment}>
          {isSubmitting ? "남기는 중..." : "칭찬 남기기"}
        </button>
      </form>
      <div aria-live="polite">
        {post.comments.map((comment) => (
          <article key={comment.id} className="comment">
            <strong>{commenterName(comment)}</strong>
            <p>{comment.body}</p>
            {renderReportControls("COMMENT", comment.id)}
          </article>
        ))}
      </div>
    </section>
  );
}
