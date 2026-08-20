import { describe, expect, it } from "vitest";
import type { ReadFeedItem } from "../../today/prototype/model";
import { buildReadAuthorLabels } from "./labels";

describe("buildReadAuthorLabels", () => {
  it("labels request and reply authors in first-seen order, reusing labels for repeat authors", () => {
    const items: ReadFeedItem[] = [
      {
        request: {
          id: "r1",
          body: "요청1",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-a",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        replies: [
          {
            id: "reply1",
            requestId: "r1",
            body: "답변1",
            createdAt: "2026-08-19T09:30:00.000Z",
            authorId: "author-b",
            reportCount: 0,
            hidden: false,
          },
        ],
      },
      {
        request: {
          id: "r2",
          body: "요청2",
          createdAt: "2026-08-18T09:00:00.000Z",
          authorId: "author-b",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        replies: [
          {
            id: "reply2",
            requestId: "r2",
            body: "답변2",
            createdAt: "2026-08-18T09:30:00.000Z",
            authorId: "author-a",
            reportCount: 0,
            hidden: false,
          },
        ],
      },
    ];

    const labels = buildReadAuthorLabels(items);

    expect(labels.get("author-a")).toBe("익명 1");
    expect(labels.get("author-b")).toBe("익명 2");
  });
});
