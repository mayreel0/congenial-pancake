"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ComfortRequestFormProps = {
  disabled: boolean;
};

export default function ComfortRequestForm({ disabled }: ComfortRequestFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/comfort/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: String(formData.get("body") ?? "") })
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    setIsSubmitting(false);
    setError("위로 요청을 남기지 못했습니다. 다시 시도해주세요.");
  }

  return (
    <section className="comfort-panel" aria-label="위로 요청 작성">
      <form onSubmit={submitRequest}>
        <label htmlFor="comfort-body">오늘 어떤 말을 듣고 싶나요?</label>
        <textarea
          id="comfort-body"
          name="body"
          placeholder="오늘 있었던 일이나 듣고 싶은 말을 짧게 적어주세요."
          maxLength={3000}
          required
          disabled={disabled || isSubmitting}
        />
        {error ? <p role="alert">{error}</p> : null}
        {disabled ? (
          <p className="muted-copy">
            <Link href="/login">로그인</Link> 후 하루에 한 번 위로 요청을 남길 수 있어요.
          </p>
        ) : null}
        <button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? "남기는 중..." : "위로 요청 남기기"}
        </button>
      </form>
    </section>
  );
}
