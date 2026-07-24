// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { NotificationType } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationsPage from "@/app/notifications/page";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user_1" } }))
}));

vi.mock("@/server/notifications", () => ({
  listNotifications: vi.fn(async () => [
    {
      id: "notification_1",
      type: NotificationType.COMMENT_ON_POST,
      readAt: null,
      createdAt: new Date("2026-07-17T08:00:00.000Z"),
      actorNickname: "따뜻한사람",
      postId: "post_1",
      postTitle: "오늘 힘든 일이 있었어요",
      bodyPreview: "정말 잘 버텼어요."
    },
    {
      id: "notification_2",
      type: NotificationType.REPLY_ON_COMMENT,
      readAt: new Date("2026-07-17T08:10:00.000Z"),
      createdAt: new Date("2026-07-17T08:05:00.000Z"),
      actorNickname: "글쓴이",
      postId: "post_2",
      postTitle: "면접을 보고 왔어요",
      bodyPreview: "덕분에 힘이 났어요."
    }
  ])
}));

vi.mock("@/app/notifications/actions", () => ({
  markNotificationsRead: vi.fn()
}));

describe("NotificationsPage", () => {
  it("renders notification messages and a mark-read action", async () => {
    render(await NotificationsPage());

    expect(screen.getByRole("heading", { name: "알림" })).toBeInTheDocument();
    expect(screen.getByText("따뜻한사람님이 내 글에 칭찬을 남겼습니다.")).toBeInTheDocument();
    expect(screen.getByText("글쓴이님이 내 칭찬에 답글을 남겼습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오늘 힘든 일이 있었어요" })).toHaveAttribute("href", "/posts/post_1");
    expect(screen.getByRole("button", { name: "모두 읽음" })).toBeInTheDocument();
  });
});
