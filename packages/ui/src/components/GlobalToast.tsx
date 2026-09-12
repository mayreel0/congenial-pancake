"use client";

import { toast, useToastState } from "../hooks/useToast";
import { Toast } from "./Toast";

// Mount exactly once, at the root layout — see useToast.ts for why this
// replaced every page mounting its own useToast()+<Toast> pair.
export function GlobalToast() {
  const state = useToastState();
  return <Toast toast={state} onDismiss={toast.dismiss} />;
}
