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
  notificationMessage: vi.fn((notification: { actor: { nickname: string }; type: NotificationType }) =>
    notification.type === NotificationType.FIRST_REPLY_ON_REQUEST
      ? `${notification.actor.nickname}님이 내 위로 요청에 첫 답변을 남겼습니다.`
      : `${notification.actor.nickname}님이 내 위로 요청에 답변을 남겼습니다.`
  ),
  getNotificationSummary: vi.fn(async () => ({
    unreadCount: 1,
    latestNotificationId: "notification_2",
    latestNotificationCreatedAt: "2026-07-17T08:05:00.000Z"
  })),
  listNotifications: vi.fn(async () => [
    {
      id: "notification_1",
      type: NotificationType.FIRST_REPLY_ON_REQUEST,
      readAt: null,
      createdAt: new Date("2026-07-17T08:00:00.000Z"),
      actorNickname: "따뜻한사람",
      requestId: "request_1",
      requestPreview: "오늘 힘든 일이 있었어요",
      bodyPreview: "정말 잘 버텼어요."
    },
    {
      id: "notification_2",
      type: NotificationType.REPLY_ON_REQUEST,
      readAt: new Date("2026-07-17T08:10:00.000Z"),
      createdAt: new Date("2026-07-17T08:05:00.000Z"),
      actorNickname: "글쓴이",
      requestId: "request_2",
      requestPreview: "면접을 보고 왔어요",
      bodyPreview: "덕분에 힘이 났어요."
    }
  ])
}));

vi.mock("@/app/notifications/actions", () => ({
  markNotificationReadAction: vi.fn(),
  markNotificationsRead: vi.fn()
}));

vi.mock("@/components/NotificationsPageRefresh", () => ({
  default: vi.fn(() => null)
}));

describe("NotificationsPage", () => {
  it("renders notification messages and read actions", async () => {
    render(await NotificationsPage());

    expect(screen.getByRole("heading", { name: "알림" })).toBeInTheDocument();
    expect(screen.getByText("읽지 않은 알림 1개")).toBeInTheDocument();
    expect(screen.getByText("따뜻한사람님이 내 위로 요청에 첫 답변을 남겼습니다.")).toBeInTheDocument();
    expect(screen.getByText("글쓴이님이 내 위로 요청에 답변을 남겼습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오늘 힘든 일이 있었어요" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "모두 읽음 처리" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이 알림 읽음" })).toBeInTheDocument();
    expect(screen.getByText("읽지 않음")).toBeInTheDocument();
    expect(screen.getByText("읽음")).toBeInTheDocument();
  });
});
