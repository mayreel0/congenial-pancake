// 온설 is a Korean-only service, so "그날" always means a KST calendar day —
// KST is a fixed UTC+9 offset with no DST, so this is plain arithmetic, no
// timezone library needed. isValidDateString/yesterdayKstDateString are
// genuinely identical to apps/web's copy and live in packages/shared —
// re-exported here so every existing import of this file keeps working
// unchanged. kstDayRange/kstDateRange stay local: they're backend-only
// (build UTC instant ranges for Drizzle queries), nothing on the frontend
// side needs them.
export { isValidDateString, yesterdayKstDateString } from 'shared/kst-date';
import { isValidDateString } from 'shared/kst-date';

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

// Every KST calendar date string from `from` to `to`, inclusive. Both are
// already-validated `YYYY-MM-DD` strings — parsed as UTC-midnight instants
// purely for day-increment arithmetic (not real UTC instants), matching
// isValidDateString's own parsing. Used to zero-fill HeatmapCalendar day
// counts for dates with no posts.
export function kstDateStringsInRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const end = Date.UTC(ty, tm - 1, td);
  const dates: string[] = [];
  for (
    let cursor = Date.UTC(fy, fm - 1, fd);
    cursor <= end;
    cursor += 24 * 60 * 60 * 1000
  ) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
}

// Default range for the day-counts endpoints when `from`/`to` aren't given
// (or are invalid): the current KST month so far, first day through today.
export function currentKstMonthRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = todayKstDateString(now);
  const [year, month] = to.split('-');
  return { from: `${year}-${month}-01`, to };
}

// A HeatmapCalendar month view never needs more than ~6 weeks of days —
// clamp the requested span so a hand-edited/malformed `from`/`to` on this
// public, unauthenticated endpoint can't force a huge zero-fill loop or
// response payload.
const MAX_DAY_COUNTS_RANGE_DAYS = 100;

function clampDayCountsRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const requestedEnd = Date.UTC(ty, tm - 1, td);
  const maxEnd = start + (MAX_DAY_COUNTS_RANGE_DAYS - 1) * 24 * 60 * 60 * 1000;
  const clampedEnd = Math.min(requestedEnd, maxEnd);
  return { from, to: new Date(clampedEnd).toISOString().slice(0, 10) };
}

// Shared query-param resolution for every day-counts endpoint
// (/requests/feed/counts, /requests/mine/counts, /replies/mine/counts):
// falls back to the current KST month when `from`/`to` are missing or
// malformed, then clamps the span.
export function resolveDayCountsRange(
  fromParam: string | undefined,
  toParam: string | undefined,
): { from: string; to: string } {
  const valid =
    fromParam &&
    toParam &&
    isValidDateString(fromParam) &&
    isValidDateString(toParam);
  const { from, to } = valid
    ? { from: fromParam, to: toParam }
    : currentKstMonthRange();
  return clampDayCountsRange(from, to);
}
