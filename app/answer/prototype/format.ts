export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

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
