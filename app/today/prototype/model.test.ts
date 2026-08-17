import { describe, expect, it } from "vitest";
import { getPriorityRequests } from "./model";
import type { PrototypeState } from "./types";

const baseState: PrototypeState = {
  viewer: { id: "viewer-local" },
  requests: [
    {
      id: "answered-today",
      body: "답변이 있는 오늘 글",
      createdAt: "2026-08-17T09:00:00.000Z",
      authorId: "author-1",
      replyIds: ["reply-1"],
      reportCount: 0,
      hidden: false,
    },
    {
      id: "unanswered-today",
      body: "답변이 없는 오늘 글",
      createdAt: "2026-08-17T08:00:00.000Z",
      authorId: "author-2",
      replyIds: [],
      reportCount: 0,
      hidden: false,
    },
    {
      id: "unanswered-yesterday",
      body: "답변이 없는 어제 글",
      createdAt: "2026-08-16T08:00:00.000Z",
      authorId: "author-3",
      replyIds: [],
      reportCount: 0,
      hidden: false,
    },
  ],
  replies: [
    {
      id: "reply-1",
      requestId: "answered-today",
      body: "답변",
      createdAt: "2026-08-17T09:30:00.000Z",
      authorId: "replier-1",
      reportCount: 0,
      hidden: false,
    },
  ],
  requestDraft: "",
  replyDrafts: {},
  selectedRequestId: null,
};

describe("getPriorityRequests", () => {
  it("prioritizes today's unanswered requests before answered requests", () => {
    const requests = getPriorityRequests(
      baseState,
      new Date("2026-08-17T12:00:00.000Z"),
    );

    expect(requests.map((request) => request.id)).toEqual([
      "unanswered-today",
      "answered-today",
      "unanswered-yesterday",
    ]);
  });
});
