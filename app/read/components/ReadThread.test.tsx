import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReadFeedItem } from "../../today/prototype/model";
import { ReadThread } from "./ReadThread";

const item: ReadFeedItem = {
  request: {
    id: "req-1",
    body: "오늘 실수한 일이 계속 떠올라요.",
    createdAt: "2026-08-19T09:00:00.000Z",
    authorId: "author-1",
    replyIds: ["reply-1"],
    reportCount: 0,
    hidden: false,
  },
  replies: [
    {
      id: "reply-1",
      requestId: "req-1",
      body: "괜히 커 보일 때가 있죠.",
      createdAt: "2026-08-19T09:30:00.000Z",
      authorId: "author-2",
      reportCount: 0,
      hidden: false,
    },
  ],
};

describe("ReadThread", () => {
  it("renders the request and every reply, and wires save/report callbacks behind each bubble's more menu", () => {
    const onToggleSaveReply = vi.fn();
    const onReportRequest = vi.fn();
    const onReportReply = vi.fn();

    render(
      <ReadThread
        authorLabels={
          new Map([
            ["author-1", "익명 1"],
            ["author-2", "익명 2"],
          ])
        }
        item={item}
        savedReplyIds={new Set()}
        onReportReply={onReportReply}
        onReportRequest={onReportRequest}
        onToggleSaveReply={onToggleSaveReply}
      />,
    );

    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
    expect(screen.getByText("괜히 커 보일 때가 있죠.")).toBeInTheDocument();

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
    const replyMenu = screen.getByLabelText("답변 도구");
    fireEvent.click(
      within(replyMenu).getByRole("button", { name: "마음에 남기기" }),
    );
    expect(onToggleSaveReply).toHaveBeenCalledWith("reply-1");

    fireEvent.click(replyMoreButton);
    fireEvent.click(
      within(screen.getByLabelText("답변 도구")).getByRole("button", {
        name: "신고하기",
      }),
    );
    expect(onReportReply).toHaveBeenCalledWith("reply-1");
  });
});
