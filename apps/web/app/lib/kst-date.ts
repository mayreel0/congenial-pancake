// Mirrors apps/api-server's common/kst-date.ts — KST is a fixed UTC+9
// offset with no DST, so plain arithmetic is enough, no timezone library.
// isValidDateString/yesterdayKstDateString are genuinely identical to the
// backend's copy and live in packages/shared — re-exported here so every
// existing import of this file keeps working unchanged.
// addDaysToDateString/formatKoreanDate stay local: they're frontend-only
// (UI date-nav arithmetic/formatting), nothing on the backend needs them.
export { isValidDateString, yesterdayKstDateString } from "shared/kst-date";

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function formatKoreanDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// "YYYY-MM" anchors for HeatmapCalendar's month view — separate from the
// day-string helpers above since a month has no "day" component to shift.
export function monthAnchorOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonthAnchor(monthAnchor: string, months: number): string {
  const [year, month] = monthAnchor.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatKoreanMonth(monthAnchor: string): string {
  const [year, month] = monthAnchor.split("-").map(Number);
  return `${year}년 ${month}월`;
}

// Every date string in the given "YYYY-MM" month, first through last day.
export function daysInMonthAnchor(monthAnchor: string): string[] {
  const [year, month] = monthAnchor.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return `${monthAnchor}-${day}`;
  });
}

// 0 (일) through 6 (토) — how many blank leading cells a month grid needs
// before its 1st falls into the right weekday column.
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
