"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_TRANSITION_MS = 600;

type RotatingOnseolLineProps = {
  messages: string[];
  paused: boolean;
  intervalMs?: number;
  transitionMs?: number;
};

export function RotatingOnseolLine({
  messages,
  paused,
  intervalMs = DEFAULT_INTERVAL_MS,
  transitionMs = DEFAULT_TRANSITION_MS,
}: RotatingOnseolLineProps) {
  const [index, setIndex] = useState(0);
  const message = messages[index] ?? "";

  useEffect(() => {
    if (paused || messages.length <= 1) return;

    const timerId = window.setTimeout(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, intervalMs);

    return () => window.clearTimeout(timerId);
  }, [index, intervalMs, messages.length, paused]);

  if (!message) return null;

  return (
    <p
      key={`${index}-${message}`}
      className="onseol-soft-wipe mx-auto line-clamp-2 min-h-14 max-w-2xl text-center text-base leading-7 text-muted sm:text-lg"
      style={
        {
          "--onseol-transition-ms": `${transitionMs}ms`,
        } as CSSProperties
      }
    >
      {message}
    </p>
  );
}
