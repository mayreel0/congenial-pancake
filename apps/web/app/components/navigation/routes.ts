export const serviceNavItems = [
  { label: "남기기", href: "/today" },
  { label: "답하기", href: "/answer" },
  { label: "온설 읽기", href: "/read" },
  { label: "내 기록", href: "/me" },
] as const;

export const landingEntryLinks = {
  start: "/today",
  login: "/login",
} as const;
