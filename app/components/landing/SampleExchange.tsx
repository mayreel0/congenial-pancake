import type { SampleExchange as SampleExchangeData } from "./landing-data";

type SampleExchangeProps = {
  exchange: SampleExchangeData;
};

export function SampleExchange({ exchange }: SampleExchangeProps) {
  return (
    <section
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
      aria-label="위로 요청과 답장 예시"
    >
      <p className="text-xs font-medium text-accent">{exchange.timestamp}</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs text-muted">위로 요청</p>
          <p className="mt-1 text-base leading-7 text-foreground">
            {exchange.request}
          </p>
        </div>
        <div className="rounded-lg bg-surface-muted p-4">
          <p className="text-xs text-muted">답장</p>
          <p className="mt-1 text-base leading-7 text-foreground">
            {exchange.reply}
          </p>
        </div>
      </div>
    </section>
  );
}
