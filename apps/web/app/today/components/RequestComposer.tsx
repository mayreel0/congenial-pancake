"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Toggle } from "ui/Toggle";

const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 128;

type RequestComposerProps = {
  value: string;
  status: "idle" | "pending" | "success";
  // Reveal toggle only renders when the user has a nickname to reveal —
  // guests and nicknameless members can never post non-anonymously (see
  // docs/decisions/2026-08-28-onseol-nickname-post-reveal-decisions.md).
  nickname: string | null;
  anonymous: boolean;
  onChange(value: string): void;
  onToggleAnonymous(): void;
  onSubmit(value: string): void | Promise<void>;
};

export function RequestComposer({
  value,
  status,
  nickname,
  anonymous,
  onChange,
  onToggleAnonymous,
  onSubmit,
}: RequestComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draftState, setDraftState] = useState({
    propValue: value,
    localValue: value,
  });
  let localValue = draftState.localValue;

  if (draftState.propValue !== value) {
    localValue = value;
    setDraftState({ propValue: value, localValue: value });
  }

  const isPending = status === "pending";
  const canSubmit = Boolean(localValue.trim()) && !isPending;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${Math.max(nextHeight, MIN_TEXTAREA_HEIGHT)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [localValue]);

  return (
    <form
      className="mx-auto w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void onSubmit(localValue.trim());
      }}
    >
      {nickname && (
        <div className="mb-1.5">
          <Toggle
            checked={!anonymous}
            label={`닉네임(${nickname})으로 남기기`}
            onChange={() => onToggleAnonymous()}
          />
        </div>
      )}
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
          value={localValue}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setDraftState({ propValue: value, localValue: nextValue });
            onChange(nextValue);
          }}
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
