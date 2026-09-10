"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createRequestSchema } from "shared/dto";
import { Button } from "ui/Button";
import { Skeleton } from "ui/Skeleton";
import { Toggle } from "ui/Toggle";
import { parseFieldErrors } from "shared/zod-form";

const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 128;

type RequestComposerProps = {
  value: string;
  status: "idle" | "pending" | "success";
  // Reveal toggle only renders when the user has a nickname to reveal —
  // guests and nicknameless members can never post non-anonymously (see
  // docs/decisions/2026-08-28-onseol-nickname-post-reveal-decisions.md).
  nickname: string | null;
  isLoadingNickname: boolean;
  anonymous: boolean;
  onChange(value: string): void;
  onToggleAnonymous(): void;
  onSubmit(value: string): void | Promise<void>;
};

export function RequestComposer({
  value,
  status,
  nickname,
  isLoadingNickname,
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
  // Just gates the button (no visible per-field error text) — an empty
  // composer isn't a mistake worth calling out, it's just the resting
  // state, and the disabled button already says "type something."
  const fieldErrors = parseFieldErrors(createRequestSchema, {
    body: localValue.trim(),
  });
  const canSubmit = Object.keys(fieldErrors).length === 0 && !isPending;

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
      {/* Fixed h-5 slot regardless of outcome (skeleton / real toggle /
          nothing) — a guest or nicknameless member ending up with no toggle
          shouldn't shift the composer below any differently than a member
          with one does, once the loading state resolves. */}
      <div className="mb-1.5 flex h-5 items-center">
        {isLoadingNickname ? (
          <Skeleton className="h-5 w-48 rounded-full" />
        ) : (
          nickname && (
            <Toggle
              checked={!anonymous}
              label={`닉네임(${nickname})으로 남기기`}
              onChange={() => onToggleAnonymous()}
            />
          )
        )}
      </div>
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
        <div className="shrink-0">
          <Button
            disabled={!canSubmit}
            pending={isPending}
            size="sm"
            type="submit"
          >
            보내기
          </Button>
        </div>
      </div>
    </form>
  );
}
