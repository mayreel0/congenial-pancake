import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listNotifications, notificationMessage } from "@/server/notifications";

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

const { db } = await import("@/lib/db");

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats first reply notifications for comfort requests", () => {
    expect(
      notificationMessage({
        type: NotificationType.FIRST_REPLY_ON_REQUEST,
        actor: { nickname: "다정한사람" },
        request: { body: "오늘 좀 지쳤어요" },
        reply: { body: "오늘은 여기까지 온 것만으로도 충분해요." }
      })
    ).toContain("첫 답변");
  });

  it("lists comfort request notifications without legacy post fields", async () => {
    vi.mocked(db.notification.findMany).mockResolvedValue([
      {
        id: "notification-1",
        type: NotificationType.FIRST_REPLY_ON_REQUEST,
        readAt: null,
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
        actor: { nickname: "다정한사람" },
        request: { id: "request-1", body: "오늘 좀 지쳤어요" },
        reply: { body: "오늘은 여기까지 온 것만으로도 충분해요." }
      }
    ] as never);

    await expect(listNotifications("user-1")).resolves.toEqual([
      {
        id: "notification-1",
        type: NotificationType.FIRST_REPLY_ON_REQUEST,
        readAt: null,
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
        actorNickname: "다정한사람",
        requestId: "request-1",
        requestPreview: "오늘 좀 지쳤어요",
        bodyPreview: "오늘은 여기까지 온 것만으로도 충분해요."
      }
    ]);
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          actor: { select: { nickname: true } },
          request: { select: { id: true, body: true } },
          reply: { select: { body: true } }
        }
      })
    );
  });
});
