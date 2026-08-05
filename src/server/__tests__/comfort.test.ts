import { DisplayMode, NotificationType, VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createComfortReply,
  createComfortRequest,
  getUtcDayRange,
  hasWrittenComfortRequestToday,
  normalizeComfortReplyBody,
  normalizeComfortRequestBody
} from "@/server/comfort";

vi.mock("@/lib/db", () => ({
  db: {
    comfortRequest: {
      count: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn()
    },
    comfortReply: {
      create: vi.fn()
    },
    contentQualityReview: {
      create: vi.fn()
    },
    notification: {
      create: vi.fn()
    },
    user: {
      findUniqueOrThrow: vi.fn()
    },
    $transaction: vi.fn((callback) =>
      callback({
        comfortRequest: {
          findUniqueOrThrow: vi.fn(),
          update: vi.fn()
        },
        comfortReply: {
          create: vi.fn()
        },
        contentQualityReview: {
          create: vi.fn()
        },
        notification: {
          create: vi.fn()
        }
      })
    )
  }
}));

const { db } = await import("@/lib/db");

describe("comfort domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes request bodies", () => {
    expect(normalizeComfortRequestBody("  오늘 좀 지쳤어요  ")).toBe("오늘 좀 지쳤어요");
    expect(() => normalizeComfortRequestBody("")).toThrow("COMFORT_REQUEST_BODY_REQUIRED");
    expect(() => normalizeComfortRequestBody("a".repeat(3001))).toThrow("COMFORT_REQUEST_BODY_TOO_LONG");
  });

  it("normalizes reply bodies", () => {
    expect(normalizeComfortReplyBody("  오늘은 좀 쉬어도 될 것 같아요  ")).toBe("오늘은 좀 쉬어도 될 것 같아요");
    expect(() => normalizeComfortReplyBody("")).toThrow("COMFORT_REPLY_BODY_REQUIRED");
    expect(() => normalizeComfortReplyBody("a".repeat(1001))).toThrow("COMFORT_REPLY_BODY_TOO_LONG");
  });

  it("calculates day range for daily request limits", () => {
    const { start, end } = getUtcDayRange(new Date("2026-08-05T12:34:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-06T00:00:00.000Z");
  });

  it("checks whether user wrote a request today", async () => {
    vi.mocked(db.comfortRequest.count).mockResolvedValue(1);
    await expect(hasWrittenComfortRequestToday("user-1", new Date("2026-08-05T12:00:00.000Z"))).resolves.toBe(true);
  });

  it("creates a comfort request with quality metadata", async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue({ sanctionState: "NORMAL" });
    vi.mocked(db.comfortRequest.count).mockResolvedValue(0);
    vi.mocked(db.comfortRequest.create).mockResolvedValue({
      id: "request-1",
      authorUserId: "user-1",
      body: "오늘 좀 지쳤어요",
      displayMode: DisplayMode.ANONYMOUS,
      status: VisibilityState.VISIBLE,
      qualityScore: 0,
      qualityLabel: "ALLOWED",
      firstRepliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const request = await createComfortRequest(
      { body: "오늘 좀 지쳤어요", displayMode: DisplayMode.ANONYMOUS },
      "user-1"
    );

    expect(request.id).toBe("request-1");
    expect(db.comfortRequest.create).toHaveBeenCalled();
    expect(db.contentQualityReview.create).toHaveBeenCalled();
  });

  it("rejects a second request on the same day", async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue({ sanctionState: "NORMAL" });
    vi.mocked(db.comfortRequest.count).mockResolvedValue(1);

    await expect(
      createComfortRequest({ body: "오늘도 적고 싶어요", displayMode: DisplayMode.NICKNAME }, "user-1")
    ).rejects.toThrow("COMFORT_REQUEST_DAILY_LIMIT");
  });
});
