"use client";

import { useEffect } from "react";
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
      displayMode: string;
      author: { nickname: string } | null;
    }>;
  };
};

function commenterName(comment: PraiseRoomProps["post"]["comments"][number]): string {
  if (comment.isAiGenerated) return "AI 칭찬";
  if (comment.displayMode === "ANONYMOUS") return "익명";
  return comment.author?.nickname ?? "익명";
}

export default function PraiseRoom({ post }: PraiseRoomProps) {
  useEffect(() => {
    const socket = createPostSocket(post.id);
    socket.on("post:event", () => {
      window.location.reload();
    });
    return () => {
      socket.disconnect();
    };
  }, [post.id]);

  return (
    <section className="page-section">
      <h1>{post.title}</h1>
      <p>{post.body}</p>
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
