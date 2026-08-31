// 온설 is a Korean-only service, so "그날" always means a KST calendar day —
// KST is a fixed UTC+9 offset with no DST, so this is plain arithmetic, no
// timezone library needed. Only the subset genuinely identical between
// apps/api-server and apps/web lives here — each app also keeps its own
// app-specific date helpers locally (SQL date-range builders on the
// backend, UI date-string arithmetic/formatting on the frontend).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Guards a date string coming from a query param or URL before it's
// trusted — a stale/hand-edited/malformed value should fall back to a
// default rather than being used as-is.
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function yesterdayKstDateString(now: Date = new Date()): string {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  kstNow.setUTCDate(kstNow.getUTCDate() - 1);
  return kstNow.toISOString().slice(0, 10);
}
