"use client";

import { FormEvent, useState } from "react";

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function promptAnswersFromForm(formData: FormData): Record<string, string> | null {
  const answers = {
    accomplished: formString(formData, "accomplished").trim(),
    praisePoint: formString(formData, "praisePoint").trim(),
    tone: formString(formData, "tone").trim()
  };
  const entries = Object.entries(answers).filter(([, value]) => value.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

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
        title: formString(formData, "title"),
        body: formString(formData, "body"),
        displayMode: formString(formData, "displayMode"),
        promptAnswers: promptAnswersFromForm(formData)
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
