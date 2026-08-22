import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnswerLogEntry } from "../useAnswerQueue";
import type { RequestDto } from "../../lib/requests/api";
import type { ReplyDto } from "../../lib/replies/api";
import { AnswerLog } from "./AnswerLog";

function makeRequest(overrides: Partial<RequestDto>): RequestDto {
  return {
    id: "request",
    body: "요청 본문",
    createdAt: "2026-08-15T09:00:00.000Z",
    replyCount: 1,
    ...overrides,
  };
}

function makeReply(overrides: Partial<ReplyDto>): ReplyDto {
  return {
    id: "reply",
    requestId: "request",
    body: "답변 본문",
    createdAt: "2026-08-15T09:00:00.000Z",
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
    });
    const requestB = makeRequest({
      id: "request-b",
      body: "8월 15일 두번째 요청",
      createdAt: "2026-08-15T11:00:00.000Z",
    });
    const requestC = makeRequest({
      id: "request-c",
      body: "8월 17일 요청",
      createdAt: "2026-08-17T09:00:00.000Z",
    });
    const liveRequest = makeRequest({
      id: "request-live",
      body: "오늘 답할 요청",
      createdAt: "2026-08-19T09:00:00.000Z",
    });

    const entries: AnswerLogEntry[] = [
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
    ];

    render(
      <AnswerLog
        authorLabels={new Map()}
        canManageCurrentRequest
        currentRequest={liveRequest}
        entries={entries}
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
      "오늘",
      "8월 17일",
      "8월 15일",
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
    });
    const liveRequest = makeRequest({
      id: "request-live",
      body: "오늘 답할 다음 요청",
      createdAt: "2026-08-19T09:00:00.000Z",
    });

    const entries: AnswerLogEntry[] = [
      {
        request: requestToday,
        reply: makeReply({
          id: "reply-today",
          requestId: "request-today",
          body: "오늘 답변",
          createdAt: "2026-08-19T08:30:00.000Z",
        }),
      },
    ];

    render(
      <AnswerLog
        authorLabels={new Map()}
        canManageCurrentRequest
        currentRequest={liveRequest}
        entries={entries}
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

  it("hides the more-menu trigger when the viewer cannot manage the current request", () => {
    const liveRequest = makeRequest({ id: "request-live", body: "요청" });

    render(
      <AnswerLog
        authorLabels={new Map()}
        canManageCurrentRequest={false}
        currentRequest={liveRequest}
        entries={[]}
        isTyping={false}
        leavingRequestId={null}
        loadingNext={false}
        onHold={noop}
        onReport={noop}
        onSkip={noop}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
    // Skip stays available regardless — it's the one action guests can take.
    expect(screen.getByRole("button", { name: "다음 글" })).toBeInTheDocument();
  });
});
