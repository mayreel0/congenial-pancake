export const GUEST_ID_COOKIE_NAME = 'guest_id';
// Deliberately short, not "remember this guest forever" — the guest
// request-post limit (DB unique on requests.guest_id) and guest reply cap
// (RepliesService's count check) are both keyed on this one value, so
// letting the cookie expire is how those limits reset. A returning guest
// who's been gone a day gets a clean slate instead of a permanent "already
// used" wall. See docs/decisions/2026-08-23-onseol-guest-id-cookie-decisions.md
// for why this identity was never meant to resist a determined bypass in
// the first place (worst case: a few extra guest posts).
export const GUEST_ID_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
