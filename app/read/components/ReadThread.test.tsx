import { fireEvent, render, screen } from "@testing-library/react";
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
  it("renders the request and every reply, and wires save/report callbacks", () => {
    const onToggleSave = vi.fn();
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
        saved={false}
        onReportReply={onReportReply}
        onReportRequest={onReportRequest}
        onToggleSave={onToggleSave}
      />,
    );

    expect(
      screen.getByText("오늘 실수한 일이 계속 떠올라요."),
    ).toBeInTheDocument();
    expect(screen.getByText("괜히 커 보일 때가 있죠.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "마음에 남기기" }));
    expect(onToggleSave).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "이 온설 신고하기" }));
    expect(onReportRequest).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "이 답변 신고하기" }));
    expect(onReportReply).toHaveBeenCalledWith("reply-1");
  });
});
