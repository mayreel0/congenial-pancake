// Shared with apps/admin — see
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md. The
// other helpers below are apps/web-only (used by /today's day grouping and
// /me's join date) and stay here.
export { formatTimestamp } from "utils";

export function isSameCalendarDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayLabel(iso: string, now: Date = new Date()): string {
  if (isSameCalendarDay(iso, now.toISOString())) return "오늘";

  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatJoinedDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function truncatePreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Shared bucketing for both "N ago" and "N until" phrasing below — takes
// the absolute size of a duration and returns which unit reads most
// naturally at that size, or null under a minute (both callers show a
// fixed word for that case instead of "0분").
function relativeMagnitude(
  absoluteMs: number,
): { value: number; unit: "분" | "시간" | "일" } | null {
  if (absoluteMs < MINUTE_MS) return null;
  if (absoluteMs < HOUR_MS) return { value: Math.floor(absoluteMs / MINUTE_MS), unit: "분" };
  if (absoluteMs < DAY_MS) return { value: Math.floor(absoluteMs / HOUR_MS), unit: "시간" };
  return { value: Math.floor(absoluteMs / DAY_MS), unit: "일" };
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const magnitude = relativeMagnitude(now.getTime() - new Date(iso).getTime());
  return magnitude ? `${magnitude.value}${magnitude.unit} 전` : "방금";
}

// HoldPanel's "언제 답변 큐 신선도 만료로 사라지는지" — same bucketing as
// formatRelativeTime, just phrased forward instead of backward.
export function formatTimeRemaining(iso: string, now: Date = new Date()): string {
  const remainingMs = new Date(iso).getTime() - now.getTime();
  const magnitude = relativeMagnitude(remainingMs);
  if (remainingMs <= 0 || !magnitude) return "곧 만료";
  return `${magnitude.value}${magnitude.unit} 후 만료`;
}
