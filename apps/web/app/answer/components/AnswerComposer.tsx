"use client";

import { useLayoutEffect, useRef } from "react";
import { createReplySchema } from "shared/dto";
import { Button } from "ui/Button";
import { Skeleton } from "ui/Skeleton";
import { Toggle } from "ui/Toggle";
import { BUTTON_PENDING_MIN_MS, useMinDisplayDuration } from "ui/useMinDisplayDuration";
import { parseFieldErrors } from "shared/zod-form";

const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 128;

type AnswerComposerProps = {
  value: string;
  disabled: boolean;
  pending: boolean;
  isAnsweringHeldRequest: boolean;
  // Same reveal-toggle rule as RequestComposer — hidden entirely when the
  // user has no nickname to reveal.
  nickname: string | null;
  isLoadingNickname: boolean;
  anonymous: boolean;
  onChange(value: string): void;
  onToggleAnonymous(): void;
  onSubmit(): void;
  onCancelHeld(): void;
};

export function AnswerComposer({
  value,
  disabled,
  pending,
  isAnsweringHeldRequest,
  nickname,
  isLoadingNickname,
  anonymous,
  onChange,
  onToggleAnonymous,
  onSubmit,
  onCancelHeld,
}: AnswerComposerProps) {
  // A fast local reply can complete in under a frame, which makes the
  // spinner flash too briefly to register as feedback at all — this holds
  // the busy state visible for a minimum duration, appearing in the same
  // instant `pending` does (no gap before the spinner shows).
  const showSpinner = useMinDisplayDuration(pending, BUTTON_PENDING_MIN_MS);
  const fieldDisabled = disabled || showSpinner;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Just gates the button (no visible per-field error text) — an empty
  // composer isn't a mistake worth calling out, it's just the resting
  // state, and the disabled button already says "type something."
  const fieldErrors = parseFieldErrors(createReplySchema, {
    body: value.trim(),
  });

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
      className="border-t border-line bg-background px-5 py-4 sm:px-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (Object.keys(fieldErrors).length === 0) onSubmit();
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="pb-2 text-xs text-muted">
          정답을 쓰지 않아도 됩니다. 짧게 들었다는 말이면 충분해요.
        </p>
        {/* Fixed h-5 slot regardless of outcome — same reasoning as
            RequestComposer's toggle: don't let the composer shift once
            loading resolves, whichever way it resolves. */}
        <div className="mb-2 flex h-5 items-center">
          {isLoadingNickname ? (
            <Skeleton className="h-5 w-48 rounded-full" />
          ) : (
            nickname && (
              <Toggle
                checked={!anonymous}
                disabled={fieldDisabled}
                label={`닉네임(${nickname})으로 남기기`}
                onChange={() => onToggleAnonymous()}
              />
            )
          )}
        </div>
        {isAnsweringHeldRequest && (
          <div className="flex items-center justify-between pb-2 text-xs text-muted">
            <span>보류한 온설에 답하는 중이에요.</span>
            <button
              className="font-medium text-foreground underline"
              type="button"
              onClick={onCancelHeld}
            >
              그만두기
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition focus-within:border-primary">
          <label className="sr-only" htmlFor="answer-body">
            답변 남기기
          </label>
          <textarea
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            disabled={fieldDisabled}
            id="answer-body"
            maxLength={180}
            placeholder="그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요."
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="shrink-0">
            <Button
              disabled={fieldDisabled || Object.keys(fieldErrors).length > 0}
              pending={showSpinner}
              size="sm"
              type="submit"
            >
              답변하기
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
