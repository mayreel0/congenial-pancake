// Mirrors apps/api-server's common/kst-date.ts — KST is a fixed UTC+9
// offset with no DST, so plain arithmetic is enough, no timezone library.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function yesterdayKstDateString(now: Date = new Date()): string {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  kstNow.setUTCDate(kstNow.getUTCDate() - 1);
  return kstNow.toISOString().slice(0, 10);
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function formatKoreanDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
