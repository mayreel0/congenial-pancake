import { describe, expect, it } from "vitest";
import {
  getPriorityRequests,
  getRecentNonViewerRequests,
  getTodayEntryMessages,
} from "./model";
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

describe("getRecentNonViewerRequests", () => {
  it("returns recent visible requests that were not written by the viewer", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "mine-new",
          body: "내가 방금 쓴 글",
          createdAt: "2026-08-17T12:00:00.000Z",
          authorId: "viewer-local",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "other-new",
          body: "다른 사람이 쓴 최신 글",
          createdAt: "2026-08-17T11:00:00.000Z",
          authorId: "author-1",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "other-hidden",
          body: "숨겨진 글",
          createdAt: "2026-08-17T10:00:00.000Z",
          authorId: "author-2",
          replyIds: [],
          reportCount: 1,
          hidden: true,
        },
        {
          id: "other-old",
          body: "다른 사람이 쓴 예전 글",
          createdAt: "2026-08-16T10:00:00.000Z",
          authorId: "author-3",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
    };

    expect(
      getRecentNonViewerRequests(state).map((request) => request.id),
    ).toEqual(["other-new", "other-old"]);
  });

  it("limits the returned requests when a limit is provided", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "other-new",
          body: "최신 글",
          createdAt: "2026-08-17T11:00:00.000Z",
          authorId: "author-1",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "other-old",
          body: "예전 글",
          createdAt: "2026-08-16T10:00:00.000Z",
          authorId: "author-2",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
    };

    expect(
      getRecentNonViewerRequests(state, 1).map((request) => request.id),
    ).toEqual(["other-new"]);
  });

  it("returns fallback messages when there are no visible non-viewer requests", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "mine-new",
          body: "내가 쓴 글",
          createdAt: "2026-08-17T12:00:00.000Z",
          authorId: "viewer-local",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
    };

    expect(getTodayEntryMessages(state, ["기본 샘플"])).toEqual(["기본 샘플"]);
  });
});
