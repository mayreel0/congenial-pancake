type ReplyComposerProps = {
  value: string;
  disabled: boolean;
  onChange(value: string): void;
  onSubmit(): void;
};

export function ReplyComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: ReplyComposerProps) {
  const remaining = 180 - value.length;

  return (
    <form
      className="rounded-lg border border-line bg-surface-muted p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{remaining}자</span>
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={disabled || !value.trim()}
        >
          답변하기
        </button>
      </div>
    </form>
  );
}
