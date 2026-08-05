"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type ComfortRequest = {
  id: string;
  body: string;
  replyCount: number;
};

type ComfortReplyPanelProps = {
  requests: ComfortRequest[];
  isAuthenticated: boolean;
};

export default function ComfortReplyPanel({ requests, isAuthenticated }: ComfortReplyPanelProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(requests[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;

  useEffect(() => {
    if (!selectedRequestId || !requests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(requests[0]?.id ?? null);
    }
  }, [requests, selectedRequestId]);

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRequest) return;

    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/comfort/requests/${selectedRequest.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: String(formData.get("body") ?? "") })
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    setIsSubmitting(false);
    setError("답변을 남기지 못했습니다. 다시 시도해주세요.");
  }

  return (
    <section className="comfort-panel" aria-label="다른 사람에게 답변하기">
      {!isAuthenticated ? (
        <p className="muted-copy">
          답변을 남기려면 <Link href="/login">로그인</Link>이 필요해요.
        </p>
      ) : null}
      {requests.length === 0 ? <p>지금 답변할 수 있는 위로 요청이 없어요.</p> : null}
      {requests.length > 0 ? (
        <div className="comfort-request-list" aria-label="답변할 위로 요청">
          {requests.map((request) => (
            <article key={request.id} className="feed-item">
              <p>{request.body}</p>
              <small>답변 {request.replyCount}개</small>
              <button
                type="button"
                className="secondary-button"
                aria-pressed={selectedRequest?.id === request.id}
                onClick={() => setSelectedRequestId(request.id)}
              >
                이 요청에 답변하기
              </button>
            </article>
          ))}
        </div>
      ) : null}
      {selectedRequest ? (
        <form onSubmit={submitReply}>
          <label htmlFor="comfort-reply-body">{selectedRequest.body}</label>
          <textarea
            id="comfort-reply-body"
            name="body"
            maxLength={1000}
            required
            disabled={!isAuthenticated || isSubmitting}
          />
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={!isAuthenticated || isSubmitting}>
            {isSubmitting ? "남기는 중..." : "답변 남기기"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
