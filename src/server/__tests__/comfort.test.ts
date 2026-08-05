import { DisplayMode, Prisma, VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createComfortReply,
  createComfortRequest,
  getKstLocalDate,
  hasWrittenComfortRequestToday,
  listAnswerableComfortRequests,
  listRecentComfortExamples,
  normalizeComfortReplyBody,
  normalizeComfortRequestBody
} from "@/server/comfort";

const mocks = vi.hoisted(() => ({
  txComfortRequestFindUniqueOrThrow: vi.fn(),
  txComfortRequestUpdateMany: vi.fn(),
  txComfortReplyCreate: vi.fn(),
  txContentQualityReviewCreate: vi.fn(),
  txNotificationCreate: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    comfortRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    contentQualityReview: {
      create: vi.fn()
    },
    user: {
      findUniqueOrThrow: vi.fn()
    },
    $transaction: vi.fn((callback) =>
      callback({
        comfortRequest: {
          findUniqueOrThrow: mocks.txComfortRequestFindUniqueOrThrow,
          updateMany: mocks.txComfortRequestUpdateMany
        },
        comfortReply: {
          create: mocks.txComfortReplyCreate
        },
        contentQualityReview: {
          create: mocks.txContentQualityReviewCreate
        },
        notification: {
          create: mocks.txNotificationCreate
        }
      })
    )
  }
}));

const { db } = await import("@/lib/db");

const normalUser = { sanctionState: "NORMAL" };
const visibleRequest = { authorUserId: "request-author", firstRepliedAt: null, status: VisibilityState.VISIBLE };

function uniqueConflict(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError("unique conflict", {
    code: "P2002",
    clientVersion: "test",
    meta: { target }
  });
}

describe("comfort domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue(normalUser as never);
    vi.mocked(db.comfortRequest.findUnique).mockResolvedValue(null);
    mocks.txComfortRequestFindUniqueOrThrow.mockResolvedValue(visibleRequest);
    mocks.txComfortRequestUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txComfortReplyCreate.mockResolvedValue({ id: "reply-1", createdAt: new Date("2026-08-05T01:00:00.000Z") });
    mocks.txContentQualityReviewCreate.mockResolvedValue({});
    mocks.txNotificationCreate.mockResolvedValue({});
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

  it("derives KST local dates for daily request limits", () => {
    expect(getKstLocalDate(new Date("2026-08-05T14:59:59.000Z"))).toBe("2026-08-05");
    expect(getKstLocalDate(new Date("2026-08-05T15:00:00.000Z"))).toBe("2026-08-06");
  });

  it("checks whether user wrote a request on the KST local date", async () => {
    vi.mocked(db.comfortRequest.findUnique).mockResolvedValue({ id: "request-1" } as never);

    await expect(hasWrittenComfortRequestToday("user-1", new Date("2026-08-05T15:00:00.000Z"))).resolves.toBe(true);
    expect(db.comfortRequest.findUnique).toHaveBeenCalledWith({
      where: { authorUserId_localDate: { authorUserId: "user-1", localDate: "2026-08-06" } },
      select: { id: true }
    });
  });

  it("creates a comfort request with the KST local date and quality metadata", async () => {
    vi.mocked(db.comfortRequest.create).mockResolvedValue({ id: "request-1" } as never);

    await createComfortRequest(
      { body: "오늘 좀 지쳤어요", displayMode: DisplayMode.ANONYMOUS },
      "user-1",
      new Date("2026-08-05T15:00:00.000Z")
    );

    expect(db.comfortRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorUserId: "user-1", localDate: "2026-08-06" }) })
    );
    expect(db.contentQualityReview.create).toHaveBeenCalled();
  });

  it("maps daily request unique conflicts to the daily limit error", async () => {
    vi.mocked(db.comfortRequest.create).mockRejectedValue(uniqueConflict(["authorUserId", "localDate"]));

    await expect(
      createComfortRequest({ body: "오늘도 적고 싶어요", displayMode: DisplayMode.NICKNAME }, "user-1")
    ).rejects.toThrow("COMFORT_REQUEST_DAILY_LIMIT");
  });

  it("rejects replying to the request author", async () => {
    mocks.txComfortRequestFindUniqueOrThrow.mockResolvedValue({ ...visibleRequest, authorUserId: "user-1" });

    await expect(
      createComfortReply("request-1", "user-1", { body: "혼자 감당하지 않아도 돼요", displayMode: DisplayMode.ANONYMOUS })
    ).rejects.toThrow("COMFORT_REPLY_SELF_NOT_ALLOWED");
    expect(mocks.txComfortReplyCreate).not.toHaveBeenCalled();
  });

  it("maps reply unique conflicts to the already-exists error", async () => {
    mocks.txComfortReplyCreate.mockRejectedValue(uniqueConflict(["requestId", "authorUserId"]));

    await expect(
      createComfortReply("request-1", "user-1", { body: "혼자 감당하지 않아도 돼요", displayMode: DisplayMode.ANONYMOUS })
    ).rejects.toThrow("COMFORT_REPLY_ALREADY_EXISTS");
  });

  it("rejects replies to non-visible requests", async () => {
    mocks.txComfortRequestFindUniqueOrThrow.mockResolvedValue({ ...visibleRequest, status: VisibilityState.HELD });

    await expect(
      createComfortReply("request-1", "user-1", { body: "혼자 감당하지 않아도 돼요", displayMode: DisplayMode.ANONYMOUS })
    ).rejects.toThrow("COMFORT_REQUEST_NOT_VISIBLE");
    expect(mocks.txComfortReplyCreate).not.toHaveBeenCalled();
  });

  it("does not advance first-reply state for a non-visible reply", async () => {
    await createComfortReply("request-1", "user-1", {
      body: "자살해",
      displayMode: DisplayMode.ANONYMOUS
    });

    expect(mocks.txComfortRequestUpdateMany).not.toHaveBeenCalled();
    expect(mocks.txNotificationCreate).not.toHaveBeenCalled();
  });

  it("notifies only the transaction that claims the first visible reply", async () => {
    await createComfortReply("request-1", "user-1", {
      body: "혼자 감당하지 않아도 돼요",
      displayMode: DisplayMode.ANONYMOUS
    });

    expect(mocks.txComfortRequestUpdateMany).toHaveBeenCalledWith({
      where: { id: "request-1", firstRepliedAt: null },
      data: { firstRepliedAt: new Date("2026-08-05T01:00:00.000Z") }
    });
    expect(mocks.txNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "FIRST_REPLY_ON_REQUEST", requestId: "request-1" }) })
    );
  });

  it("does not notify when another transaction already claimed the first visible reply", async () => {
    mocks.txComfortRequestUpdateMany.mockResolvedValue({ count: 0 });

    await createComfortReply("request-1", "user-1", {
      body: "혼자 감당하지 않아도 돼요",
      displayMode: DisplayMode.ANONYMOUS
    });

    expect(mocks.txNotificationCreate).not.toHaveBeenCalled();
  });

  it("filters list helper queries to visible requests and replies", async () => {
    vi.mocked(db.comfortRequest.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    await listRecentComfortExamples();
    await listAnswerableComfortRequests("user-1");

    expect(db.comfortRequest.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { status: VisibilityState.VISIBLE },
        select: expect.objectContaining({ replies: expect.objectContaining({ where: { status: VisibilityState.VISIBLE } }) })
      })
    );
    expect(db.comfortRequest.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ authorUserId: { not: "user-1" }, status: VisibilityState.VISIBLE })
      })
    );
  });
});
