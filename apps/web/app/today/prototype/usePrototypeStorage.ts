"use client";

import { useEffect, useState } from "react";
import { createInitialPrototypeState } from "./seed-data";
import {
  readPrototypeState,
  resetPrototypeState,
  writePrototypeState,
} from "./storage";
import type { PrototypeState } from "./types";

export type UsePrototypeStorageResult = {
  state: PrototypeState;
  hydrated: boolean;
  updateState(updater: (current: PrototypeState) => PrototypeState): void;
  resetPrototype(): void;
};

export function usePrototypeStorage(): UsePrototypeStorageResult {
  const [state, setState] = useState<PrototypeState>(() =>
    createInitialPrototypeState(new Date()),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setState(readPrototypeState());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writePrototypeState(state);
    }
  }, [hydrated, state]);

  function updateState(
    updater: (current: PrototypeState) => PrototypeState,
  ): void {
    setState((current) => {
      const next = updater(current);
      writePrototypeState(next);
      return next;
    });
  }

  function resetPrototype(): void {
    setState(resetPrototypeState());
  }

  return { state, hydrated, updateState, resetPrototype };
}
