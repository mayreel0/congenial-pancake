"use client";

import { FormEvent, useState } from "react";

export default function NewPostPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        body: formData.get("body"),
        displayMode: formData.get("displayMode"),
        promptAnswers: {
          accomplished: formData.get("accomplished"),
          praisePoint: formData.get("praisePoint"),
          tone: formData.get("tone")
        }
      })
    });

    if (response.ok) {
      window.location.assign("/");
      return;
    }

    setIsSubmitting(false);
    setError("글을 올리지 못했습니다. 다시 시도해주세요.");
  }

  return (
    <section className="page-section">
      <h1>칭찬받고 싶은 글쓰기</h1>
      <form onSubmit={createPost}>
        <label>
          제목
          <input name="title" maxLength={120} required />
        </label>
        <label>
          본문
          <textarea name="body" maxLength={3000} required />
        </label>
        <label>
          오늘 내가 해낸 일
          <input name="accomplished" />
        </label>
        <label>
          칭찬받고 싶은 점
          <input name="praisePoint" />
        </label>
        <label>
          듣고 싶은 칭찬 톤
          <input name="tone" />
        </label>
        <label>
          표시 방식
          <select name="displayMode" defaultValue="NICKNAME">
            <option value="NICKNAME">닉네임</option>
            <option value="ANONYMOUS">익명</option>
          </select>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "올리는 중..." : "올리기"}
        </button>
      </form>
    </section>
  );
}
