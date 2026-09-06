import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FeedItemDto } from "../../lib/requests/api";
import { ReadThread } from "./ReadThread";

const item: FeedItemDto = {
  request: {
    id: "req-1",
    body: "오늘 실수한 일이 계속 떠올라요.",
    createdAt: "2026-08-19T09:00:00.000Z",
    replyCount: 1,
    authorSlot: 0,
    author: { anonymous: true },
  },
  replies: [
    {
      id: "reply-1",
      requestId: "req-1",
      body: "괜히 커 보일 때가 있죠.",
      createdAt: "2026-08-19T09:30:00.000Z",
      authorSlot: 1,
      author: { anonymous: true },
    },
  ],
};

describe("ReadThread", () => {
  it("renders the request and every reply, and wires save/report callbacks", () => {
    const onToggleSaveReply = vi.fn();
    const onReportRequest = vi.fn();
    const onReportReply = vi.fn();

    render(
      <ReadThread
        authorLabels={
          new Map([
            [0, "익명 1"],
            [1, "익명 2"],
          ])
        }
        item={item}
        savedReplyIds={new Set()}
        showActions
        onReportReply={onReportReply}
        onReportRequest={onReportRequest}
        onToggleSaveReply={onToggleSaveReply}
      />,
    );

    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
    expect(screen.getByText("괜히 커 보일 때가 있죠.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "마음에 남기기" }));
    expect(onToggleSaveReply).toHaveBeenCalledWith("reply-1");

    const [requestMoreButton, replyMoreButton] = screen.getAllByRole(
      "button",
      { name: "더보기" },
    );

    fireEvent.click(requestMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("온설 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    expect(onReportRequest).toHaveBeenCalledOnce();

    fireEvent.click(replyMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("답변 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    expect(onReportReply).toHaveBeenCalledWith("reply-1");
  });

  it("shows the saved state on the standalone save button", () => {
    render(
      <ReadThread
        authorLabels={new Map()}
        item={item}
        savedReplyIds={new Set(["reply-1"])}
        showActions
        onReportReply={() => {}}
        onReportRequest={() => {}}
        onToggleSaveReply={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: /마음에 남긴 답변/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("hides save/report actions when showActions is false", () => {
    render(
      <ReadThread
        authorLabels={new Map()}
        item={item}
        savedReplyIds={new Set()}
        showActions={false}
        onReportReply={() => {}}
        onReportRequest={() => {}}
        onToggleSaveReply={() => {}}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "마음에 남기기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
  });
});
