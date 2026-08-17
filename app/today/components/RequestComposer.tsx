"use client";

import { useLayoutEffect, useRef } from "react";

const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 128;

type RequestComposerProps = {
  value: string;
  status: "idle" | "pending" | "success";
  onChange(value: string): void;
  onSubmit(): void | Promise<void>;
};

export function RequestComposer({
  value,
  status,
  onChange,
  onSubmit,
}: RequestComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPending = status === "pending";
  const canSubmit = Boolean(value.trim()) && !isPending;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${Math.max(nextHeight, MIN_TEXTAREA_HEIGHT)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value]);

  return (
    <form
      className="mx-auto w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="request-body">
        오늘 어떤 말을 듣고 싶나요?
      </label>
      <div className="flex items-end gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition focus-within:border-primary">
        <textarea
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-foreground outline-none placeholder:text-muted"
          disabled={isPending}
          id="request-body"
          maxLength={160}
          placeholder="오늘 어떤 말을 듣고 싶나요?"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
          type="submit"
        >
          {isPending ? "남기는 중" : "보내기"}
        </button>
      </div>
    </form>
  );
}
