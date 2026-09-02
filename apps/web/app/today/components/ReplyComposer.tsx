"use client";

import { createReplySchema } from "shared/dto";
import { useFieldValidation } from "../../lib/useFieldValidation";
import { parseFieldErrors } from "../../lib/zod-form";

type ReplyComposerProps = {
  value: string;
  disabled: boolean;
  onChange(value: string): void;
  onSubmit(): void;
};

type Field = "body";

export function ReplyComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: ReplyComposerProps) {
  const remaining = 180 - value.length;
  const { touch, touchAll, visibleError } = useFieldValidation<Field>();
  const fieldErrors = parseFieldErrors(createReplySchema, {
    body: value.trim(),
  });
  const error = visibleError("body", fieldErrors);

  return (
    <form
      className="rounded-lg border border-line bg-surface-muted p-4"
      onSubmit={(event) => {
        event.preventDefault();
        touchAll(["body"]);
        if (Object.keys(fieldErrors).length === 0) onSubmit();
      }}
    >
      <label className="text-sm font-semibold text-foreground" htmlFor="reply">
        답변 남기기
      </label>
      <textarea
        className="mt-3 min-h-28 w-full resize-none rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id="reply"
        maxLength={180}
        placeholder={
          disabled
            ? "이 요청에는 이미 답변을 남겼습니다."
            : "과하지 않게, 현실적인 한마디를 남겨주세요."
        }
        value={value}
        onBlur={() => touch("body")}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{remaining}자</span>
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={disabled || Object.keys(fieldErrors).length > 0}
        >
          답변하기
        </button>
      </div>
    </form>
  );
}
