export const serviceNavItems = [
  { label: "남기기", href: "/today" },
  { label: "답하기", href: "/answer" },
  { label: "온설 읽기", href: "/read" },
] as const;

// Member-only destinations, shown via the profile menu (desktop) and
// appended to the mobile menu when authenticated — never in the main
// desktop nav bar. Kept separate from serviceNavItems (which is public,
// shown to guests too) rather than one list with per-item auth flags.
export const accountNavItems = [
  { label: "내 정보", href: "/me" },
  { label: "내 기록", href: "/records" },
  { label: "설정", href: "/settings" },
] as const;

export const landingEntryLinks = {
  start: "/today",
  login: "/login",
} as const;
