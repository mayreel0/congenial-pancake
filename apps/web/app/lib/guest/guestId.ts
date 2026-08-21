const GUEST_ID_STORAGE_KEY = "onseol.guestId";

// Identifies an anonymous (not logged in) writer to the backend — see
// apps/api's X-Guest-Id header convention. Persisted so the same browser
// keeps hitting the same guest-write limits (1 request, 5 replies per
// request) instead of getting a fresh allowance on every reload.
export function getOrCreateGuestId(): string {
  const existing = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, created);
  return created;
}
