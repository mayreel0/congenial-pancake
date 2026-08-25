// Shared with apps/admin — see
// docs/decisions/2026-08-25-onseol-shared-ui-package-decisions.md. The
// other helpers below are apps/web-only (used by /today's day grouping and
// /me's join date) and stay here.
export { formatTimestamp } from "ui/format";

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
