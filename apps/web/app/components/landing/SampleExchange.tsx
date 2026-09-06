"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "ui/Skeleton";
import { formatTimestamp } from "../../lib/format";
import {
  SAMPLE_EXCHANGE_LIMIT,
  SAMPLE_ROTATION_INTERVAL_MS,
} from "./landing-data";
import { useSampleExchangesQuery } from "../../lib/landing/queries";

function SampleExchangeSkeleton() {
  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-sm">
      <Skeleton className="h-3 w-16" />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-1.5 rounded-lg bg-surface-muted p-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </section>
  );
}

// Real recent (non-hidden, non-deleted) exchanges — cycles through
// several rather than showing just one, so the landing page doesn't feel
// static. A failed/empty fetch just hides this section.
export function SampleExchange() {
  const { data, isPending, isError } = useSampleExchangesQuery(
    SAMPLE_EXCHANGE_LIMIT,
  );
  const samples = data?.samples ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (samples.length < 2) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % samples.length);
    }, SAMPLE_ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [samples.length]);

  if (isError) return null;
  if (isPending) return <SampleExchangeSkeleton />;
  if (samples.length === 0) return null;

  const exchange = samples[index % samples.length];

  return (
    <section
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
      aria-label="위로 요청과 답장 예시"
    >
      <time
        className="text-xs font-medium text-accent"
        dateTime={exchange.reply.createdAt}
        suppressHydrationWarning
      >
        {formatTimestamp(exchange.reply.createdAt)}
      </time>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs text-muted">위로 요청</p>
          <p className="mt-1 text-base leading-7 text-foreground">
            {exchange.request.body}
          </p>
        </div>
        <div className="rounded-lg bg-surface-muted p-4">
          <p className="text-xs text-muted">답장</p>
          <p className="mt-1 text-base leading-7 text-foreground">
            {exchange.reply.body}
          </p>
        </div>
      </div>
    </section>
  );
}
