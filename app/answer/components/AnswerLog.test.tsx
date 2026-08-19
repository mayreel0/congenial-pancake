import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OnseolReply, OnseolRequest } from "../../today/prototype/types";
import { AnswerLog } from "./AnswerLog";

function makeRequest(overrides: Partial<OnseolRequest>): OnseolRequest {
  return {
    id: "request",
    body: "요청 본문",
    createdAt: "2026-08-15T09:00:00.000Z",
    authorId: "author-1",
    replyIds: [],
    reportCount: 0,
    hidden: false,
    ...overrides,
  };
}

function makeReply(overrides: Partial<OnseolReply>): OnseolReply {
  return {
    id: "reply",
    requestId: "request",
    body: "답변 본문",
    createdAt: "2026-08-15T09:00:00.000Z",
    authorId: "viewer-local",
    reportCount: 0,
    hidden: false,
    ...overrides,
  };
}

const noop = () => {};

describe("AnswerLog date dividers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds one divider per distinct day, including the live section", () => {
    const requestA = makeRequest({
      id: "request-a",
      body: "8월 15일 요청",
      createdAt: "2026-08-15T09:00:00.000Z",
      authorId: "author-a",
    });
    const requestB = makeRequest({
      id: "request-b",
      body: "8월 15일 두번째 요청",
      createdAt: "2026-08-15T11:00:00.000Z",
      authorId: "author-b",
    });
    const requestC = makeRequest({
      id: "request-c",
      body: "8월 17일 요청",
      createdAt: "2026-08-17T09:00:00.000Z",
      authorId: "author-c",
    });
    const liveRequest = makeRequest({
      id: "request-live",
      body: "오늘 답할 요청",
      createdAt: "2026-08-19T09:00:00.000Z",
      authorId: "author-live",
    });

    render(
      <AnswerLog
        authorLabels={new Map()}
        currentRequest={liveRequest}
        entries={[
          {
            request: requestA,
            reply: makeReply({
              id: "reply-a",
              requestId: "request-a",
              body: "8월 15일 답변 1",
              createdAt: "2026-08-15T09:30:00.000Z",
            }),
          },
          {
            request: requestB,
            reply: makeReply({
              id: "reply-b",
              requestId: "request-b",
              body: "8월 15일 답변 2",
              createdAt: "2026-08-15T12:00:00.000Z",
            }),
          },
          {
            request: requestC,
            reply: makeReply({
              id: "reply-c",
              requestId: "request-c",
              body: "8월 17일 답변",
              createdAt: "2026-08-17T09:30:00.000Z",
            }),
          },
        ]}
        isTyping={false}
        leavingRequestId={null}
        loadingNext={false}
        onHold={noop}
        onReport={noop}
        onSkip={noop}
      />,
    );

    const dividers = screen.getAllByRole("separator");
    expect(dividers.map((divider) => divider.textContent)).toEqual([
      "8월 15일",
      "8월 17일",
      "오늘",
    ]);

    expect(screen.getByText("8월 15일 답변 1")).toBeInTheDocument();
    expect(screen.getByText("8월 15일 답변 2")).toBeInTheDocument();
    expect(screen.getByText("8월 17일 답변")).toBeInTheDocument();
    expect(screen.getByText("오늘 답할 요청")).toBeInTheDocument();
  });

  it("does not add a live divider when the last entry is already from today", () => {
    const requestToday = makeRequest({
      id: "request-today",
      body: "오늘 답한 요청",
      createdAt: "2026-08-19T08:00:00.000Z",
      authorId: "author-today",
    });
    const liveRequest = makeRequest({
      id: "request-live",
      body: "오늘 답할 다음 요청",
      createdAt: "2026-08-19T09:00:00.000Z",
      authorId: "author-live",
    });

    render(
      <AnswerLog
        authorLabels={new Map()}
        currentRequest={liveRequest}
        entries={[
          {
            request: requestToday,
            reply: makeReply({
              id: "reply-today",
              requestId: "request-today",
              body: "오늘 답변",
              createdAt: "2026-08-19T08:30:00.000Z",
            }),
          },
        ]}
        isTyping={false}
        leavingRequestId={null}
        loadingNext={false}
        onHold={noop}
        onReport={noop}
        onSkip={noop}
      />,
    );

    const dividers = screen.getAllByRole("separator");
    expect(dividers.map((divider) => divider.textContent)).toEqual(["오늘"]);
  });
});
