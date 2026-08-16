type RequestComposerProps = {
  value: string;
  onChange(value: string): void;
  onSubmit(): void;
};

export function RequestComposer({
  value,
  onChange,
  onSubmit,
}: RequestComposerProps) {
  const remaining = 160 - value.length;

  return (
    <section className="border-b border-line bg-background px-5 py-6 sm:px-8">
      <form
        className="mx-auto max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label
          className="text-sm font-semibold text-foreground"
          htmlFor="request-body"
        >
          오늘 어떤 말을 듣고 싶나요?
        </label>
        <textarea
          className="mt-3 min-h-32 w-full resize-none rounded-lg border border-line bg-surface px-4 py-3 text-base leading-7 text-foreground outline-none transition placeholder:text-muted focus:border-primary"
          id="request-body"
          maxLength={160}
          placeholder="힘들었던 일이나 칭찬받고 싶은 일을 짧게 남겨주세요."
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            작성 중인 내용은 이 브라우저에 임시 저장됩니다.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">{remaining}자</span>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!value.trim()}
            >
              남기기
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
