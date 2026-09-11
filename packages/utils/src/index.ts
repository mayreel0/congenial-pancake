// 온설 is Korean-only, so a timestamp always renders in KST — Date's own
// getMonth/getHours etc. silently use the host machine's local timezone
// instead, which only happened to already be KST on developer machines and
// rendered wrong (off by 9 hours) on GitHub Actions' UTC runners. KST is a
// fixed UTC+9 offset with no DST, so shifting by a constant and reading
// back via the UTC getters is enough — same technique as
// packages/shared/src/kst-date.ts's KST_OFFSET_MS.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function formatTimestamp(iso: string): string {
  const date = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");

  return `${month}월 ${day}일 ${hours}:${minutes}`;
}
