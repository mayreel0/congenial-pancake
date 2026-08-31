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
