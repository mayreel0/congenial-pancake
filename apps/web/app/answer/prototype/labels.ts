import type { OnseolRequest } from "../../today/prototype/types";

export function buildAnonymousLabels(
  requests: OnseolRequest[],
): Map<string, string> {
  const labels = new Map<string, string>();
  let counter = 0;

  for (const request of requests) {
    if (!labels.has(request.authorId)) {
      counter += 1;
      labels.set(request.authorId, `익명 ${counter}`);
    }
  }

  return labels;
}
