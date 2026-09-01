// 온설 is a Korean-only service, so "그날" always means a KST calendar day —
// KST is a fixed UTC+9 offset with no DST, so this is plain arithmetic, no
// timezone library needed. isValidDateString/yesterdayKstDateString are
// genuinely identical to apps/web's copy and live in packages/shared —
// re-exported here so every existing import of this file keeps working
// unchanged. kstDayRange/kstDateRange stay local: they're backend-only
// (build UTC instant ranges for Drizzle queries), nothing on the frontend
// side needs them.
export { isValidDateString, yesterdayKstDateString } from 'shared/kst-date';

// The UTC instant marking the start of the given KST calendar day.
function kstDayStart(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000+09:00`);
}

// [start, end) UTC instant range covering one KST calendar day — end is the
// exclusive start of the next day, for use with `gte(start) && lt(end)`.
export function kstDayRange(dateString: string): { start: Date; end: Date } {
  const start = kstDayStart(dateString);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// [start, end) UTC instant range covering a KST calendar date range,
// inclusive of both `from` and `to` days.
export function kstDateRange(
  from: string | undefined,
  to: string | undefined,
): { start?: Date; end?: Date } {
  const start = from ? kstDayStart(from) : undefined;
  const end = to
    ? new Date(kstDayStart(to).getTime() + 24 * 60 * 60 * 1000)
    : undefined;
  return { start, end };
}

export function todayKstDateString(now: Date = new Date()): string {
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstNow.toISOString().slice(0, 10);
}
