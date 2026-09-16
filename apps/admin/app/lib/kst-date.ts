// Mirrors apps/web/app/lib/kst-date.ts — see that file's comment for why
// isValidDateString/yesterdayKstDateString live in packages/shared while
// these UI-only helpers (date-nav arithmetic/formatting) stay local.
export { yesterdayKstDateString } from "shared/kst-date";

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function formatKoreanDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// "YYYY-MM" anchor for HeatmapCalendar's month view.
export function monthAnchorOf(date: string): string {
  return date.slice(0, 7);
}
