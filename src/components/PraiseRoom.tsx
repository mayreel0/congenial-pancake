"use client";

import { useEffect, useRef, useState } from "react";
import { createPostSocket } from "@/lib/socket-client";

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

export default function PraiseRoom({ post }: PraiseRoomProps) {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  return (
    <section className="page-section">
      <h1>{post.title}</h1>
      <p>{post.body}</p>
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
          </article>
        ))}
      </div>
    </section>
  );
}
