// Assigns a stable "익명 N" label per request within the current session's
// visible list. Keyed by request id, not author — the real API never
// exposes who wrote a request (see docs/decisions/2026-08-21-onseol-
// anonymous-posting-decisions.md), so two requests from the same person
// can no longer be linked as "the same 익명 N" the way the old localStorage
// prototype could. Each request just gets its own number instead, which is
// if anything more private, not less.
export function buildAnonymousLabels(
  requests: Array<{ id: string }>,
): Map<string, string> {
  const labels = new Map<string, string>();
  let counter = 0;

  for (const request of requests) {
    if (!labels.has(request.id)) {
      counter += 1;
      labels.set(request.id, `익명 ${counter}`);
    }
  }

  return labels;
}
