import { describe, expect, it } from "vitest";
import {
  getAnswerQueue,
  getHeldRequests,
  getMyAnswerLog,
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
  skippedRequestIds: [],
  heldRequestIds: [],
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
      skippedRequestIds: [],
      heldRequestIds: [],
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
      skippedRequestIds: [],
      heldRequestIds: [],
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
      skippedRequestIds: [],
      heldRequestIds: [],
    };

    expect(getTodayEntryMessages(state, ["기본 샘플"])).toEqual(["기본 샘플"]);
  });
});

describe("getAnswerQueue", () => {
  const state: PrototypeState = {
    viewer: { id: "viewer-local" },
    requests: [
      {
        id: "mine",
        body: "내가 쓴 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "viewer-local",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "already-answered",
        body: "이미 답한 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-1",
        replyIds: ["reply-mine"],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "skipped",
        body: "스킵한 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-2",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "held",
        body: "보류한 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-3",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
      {
        id: "answerable",
        body: "답할 수 있는 글",
        createdAt: "2026-08-19T09:00:00.000Z",
        authorId: "author-4",
        replyIds: [],
        reportCount: 0,
        hidden: false,
      },
    ],
    replies: [
      {
        id: "reply-mine",
        requestId: "already-answered",
        body: "내가 이미 남긴 답변",
        createdAt: "2026-08-19T09:30:00.000Z",
        authorId: "viewer-local",
        reportCount: 0,
        hidden: false,
      },
    ],
    requestDraft: "",
    replyDrafts: {},
    selectedRequestId: null,
    skippedRequestIds: ["skipped"],
    heldRequestIds: ["held"],
  };

  it("excludes own requests, already-answered requests, skipped requests, and held requests", () => {
    const queue = getAnswerQueue(state, new Date("2026-08-19T12:00:00.000Z"));

    expect(queue.map((request) => request.id)).toEqual(["answerable"]);
  });
});

describe("getHeldRequests", () => {
  it("returns held requests in the order they were held, skipping hidden ones", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "held-first",
          body: "먼저 보류한 글",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-1",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "held-second",
          body: "나중에 보류한 글",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-2",
          replyIds: [],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "held-hidden",
          body: "신고돼서 숨겨진 글",
          createdAt: "2026-08-19T09:00:00.000Z",
          authorId: "author-3",
          replyIds: [],
          reportCount: 1,
          hidden: true,
        },
      ],
      replies: [],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
      skippedRequestIds: [],
      heldRequestIds: ["held-first", "held-second", "held-hidden"],
    };

    expect(getHeldRequests(state).map((request) => request.id)).toEqual([
      "held-first",
      "held-second",
    ]);
  });
});

describe("getMyAnswerLog", () => {
  it("pairs my replies with their requests, oldest reply first", () => {
    const state: PrototypeState = {
      viewer: { id: "viewer-local" },
      requests: [
        {
          id: "request-a",
          body: "요청 A",
          createdAt: "2026-08-15T09:00:00.000Z",
          authorId: "author-1",
          replyIds: ["reply-a"],
          reportCount: 0,
          hidden: false,
        },
        {
          id: "request-b",
          body: "요청 B",
          createdAt: "2026-08-10T09:00:00.000Z",
          authorId: "author-2",
          replyIds: ["reply-b"],
          reportCount: 0,
          hidden: false,
        },
      ],
      replies: [
        {
          id: "reply-a",
          requestId: "request-a",
          body: "최근에 답한 것",
          createdAt: "2026-08-19T10:00:00.000Z",
          authorId: "viewer-local",
          reportCount: 0,
          hidden: false,
        },
        {
          id: "reply-b",
          requestId: "request-b",
          body: "보류했다가 방금 답한 것",
          createdAt: "2026-08-19T11:00:00.000Z",
          authorId: "viewer-local",
          reportCount: 0,
          hidden: false,
        },
      ],
      requestDraft: "",
      replyDrafts: {},
      selectedRequestId: null,
      skippedRequestIds: [],
      heldRequestIds: [],
    };

    const log = getMyAnswerLog(state);

    expect(log.map((entry) => entry.request.id)).toEqual([
      "request-a",
      "request-b",
    ]);
  });
});
