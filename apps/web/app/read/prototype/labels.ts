import type { ReadFeedItem } from "../../today/prototype/model";

export function buildReadAuthorLabels(
  items: ReadFeedItem[],
): Map<string, string> {
  const labels = new Map<string, string>();
  let counter = 0;

  function assign(authorId: string): void {
    if (labels.has(authorId)) return;
    counter += 1;
    labels.set(authorId, `익명 ${counter}`);
  }

  for (const item of items) {
    assign(item.request.authorId);
    for (const reply of item.replies) {
      assign(reply.authorId);
    }
  }

  return labels;
}
