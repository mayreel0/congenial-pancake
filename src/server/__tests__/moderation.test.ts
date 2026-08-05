import { ModerationEventType, ModerationTargetType, ReportStatus, SanctionState, VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reviewComfortContentVisibility, reviewReport } from "@/server/moderation";

const mocks = vi.hoisted(() => ({
  txComfortRequestFindUnique: vi.fn(),
  txComfortRequestUpdate: vi.fn(),
  txComfortReplyFindUnique: vi.fn(),
  txComfortReplyUpdate: vi.fn(),
  txModerationEventCreate: vi.fn(),
  txReportFindUniqueOrThrow: vi.fn(),
  txReportUpdateMany: vi.fn(),
  txUserFindUniqueOrThrow: vi.fn(),
  txUserUpdate: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUniqueOrThrow: vi.fn()
    },
    $transaction: vi.fn((callback) =>
      callback({
        comfortRequest: {
          findUnique: mocks.txComfortRequestFindUnique,
          update: mocks.txComfortRequestUpdate
        },
        comfortReply: {
          findUnique: mocks.txComfortReplyFindUnique,
          update: mocks.txComfortReplyUpdate
        },
        moderationEvent: {
          create: mocks.txModerationEventCreate
        },
        report: {
          findUniqueOrThrow: mocks.txReportFindUniqueOrThrow,
          updateMany: mocks.txReportUpdateMany
        },
        user: {
          findUniqueOrThrow: mocks.txUserFindUniqueOrThrow,
          update: mocks.txUserUpdate
        }
      })
    )
  }
}));

describe("moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.txComfortRequestFindUnique.mockResolvedValue({ authorUserId: "request-author" });
    mocks.txComfortReplyFindUnique.mockResolvedValue({ authorUserId: "reply-author" });
    mocks.txComfortRequestUpdate.mockResolvedValue({ id: "request-1", status: VisibilityState.VISIBLE });
    mocks.txComfortReplyUpdate.mockResolvedValue({ id: "reply-1", status: VisibilityState.HIDDEN });
    mocks.txModerationEventCreate.mockResolvedValue({ id: "event-1" });
    mocks.txReportUpdateMany.mockResolvedValue({ count: 1 });
    mocks.txUserFindUniqueOrThrow.mockResolvedValue({ id: "target-author", trustScore: 100 });
    mocks.txUserUpdate.mockResolvedValue({
      id: "target-author",
      trustScore: 90,
      sanctionState: SanctionState.NORMAL
    });
  });

  it("reviews comfort request visibility", async () => {
    await reviewComfortContentVisibility({
      targetType: ModerationTargetType.COMFORT_REQUEST,
      targetId: "request-1",
      moderatorId: "moderator-1",
      status: VisibilityState.VISIBLE,
      reason: "moderator_approved_comfort_request"
    });

    expect(mocks.txComfortRequestUpdate).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: VisibilityState.VISIBLE }
    });
    expect(mocks.txModerationEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "moderator-1",
        targetType: ModerationTargetType.COMFORT_REQUEST,
        targetId: "request-1",
        eventType: ModerationEventType.VISIBILITY_CHANGED
      })
    });
  });

  it("reviews comfort reply visibility", async () => {
    await reviewComfortContentVisibility({
      targetType: ModerationTargetType.COMFORT_REPLY,
      targetId: "reply-1",
      moderatorId: "moderator-1",
      status: VisibilityState.HIDDEN,
      reason: "moderator_hidden_comfort_reply"
    });

    expect(mocks.txComfortReplyUpdate).toHaveBeenCalledWith({
      where: { id: "reply-1" },
      data: { status: VisibilityState.HIDDEN }
    });
  });

  it("applies trust delta to comfort request authors when reports are accepted", async () => {
    mocks.txReportFindUniqueOrThrow.mockResolvedValue({
      id: "report-1",
      targetType: ModerationTargetType.COMFORT_REQUEST,
      targetId: "request-1"
    });

    await reviewReport({
      reportId: "report-1",
      moderatorId: "moderator-1",
      status: ReportStatus.REVIEWED,
      reason: "moderator_accepted_report"
    });

    expect(mocks.txComfortRequestFindUnique).toHaveBeenCalledWith({
      where: { id: "request-1" },
      select: { authorUserId: true }
    });
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({
      where: { id: "request-author" },
      data: { trustScore: 90, sanctionState: SanctionState.NORMAL }
    });
  });

  it("applies trust delta to comfort reply authors when reports are accepted", async () => {
    mocks.txReportFindUniqueOrThrow.mockResolvedValue({
      id: "report-1",
      targetType: ModerationTargetType.COMFORT_REPLY,
      targetId: "reply-1"
    });

    await reviewReport({
      reportId: "report-1",
      moderatorId: "moderator-1",
      status: ReportStatus.REVIEWED,
      reason: "moderator_accepted_report"
    });

    expect(mocks.txComfortReplyFindUnique).toHaveBeenCalledWith({
      where: { id: "reply-1" },
      select: { authorUserId: true }
    });
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({
      where: { id: "reply-author" },
      data: { trustScore: 90, sanctionState: SanctionState.NORMAL }
    });
  });
});
