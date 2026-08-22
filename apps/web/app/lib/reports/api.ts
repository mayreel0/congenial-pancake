import { apiFetch } from "../api";

export type ReportTargetType = "request" | "reply";

// Reports require a session — no guest id to send, unlike requests/replies.
export function createReport(
  targetType: ReportTargetType,
  targetId: string,
): Promise<void> {
  return apiFetch<void>("/reports", {
    method: "POST",
    body: JSON.stringify({ targetType, targetId }),
  });
}
