type AnswerComposerProps = {
  value: string;
  disabled: boolean;
  isAnsweringHeldRequest: boolean;
  onChange(value: string): void;
  onSubmit(): void;
  onCancelHeld(): void;
};

export function AnswerComposer({
  value,
  disabled,
  isAnsweringHeldRequest,
  onChange,
  onSubmit,
  onCancelHeld,
}: AnswerComposerProps) {
  return (
    <form
      className="border-t border-line bg-background px-5 py-4 sm:px-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="pb-2 text-xs text-muted">
        정답을 쓰지 않아도 됩니다. 짧게 들었다는 말이면 충분해요.
      </p>
      {isAnsweringHeldRequest ? (
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
      ) : null}
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="answer-body">
          답변 남기기
        </label>
        <textarea
          className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          id="answer-body"
          maxLength={180}
          placeholder="그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !value.trim()}
          type="submit"
        >
          답변하기
        </button>
      </div>
    </form>
  );
}
