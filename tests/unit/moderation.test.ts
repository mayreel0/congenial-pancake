import { ModerationTargetType, ReportStatus, VisibilityState } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const transaction = vi.hoisted(() => vi.fn());
const userFindUniqueOrThrow = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: transaction,
    user: { findUniqueOrThrow: userFindUniqueOrThrow }
  }
}));

import { calculateSanctionState, moderateText, recordReport, reviewComfortContentVisibility, reviewReport } from "@/server/moderation";

describe("moderation", () => {
  it("holds praise disguised as mockery", () => {
    const result = moderateText("와 그걸 자랑이라고 올리다니 대단하다");
    expect(result.visibilityState).toBe(VisibilityState.AUTHOR_ONLY);
    expect(result.risk).toBeGreaterThanOrEqual(70);
  });

  it("maps trust score to sanctions", () => {
    expect(calculateSanctionState(100)).toBe("NORMAL");
    expect(calculateSanctionState(59)).toBe("LOW_TRUST");
    expect(calculateSanctionState(29)).toBe("SHADOW_BANNED");
    expect(calculateSanctionState(9)).toBe("SERVICE_BANNED");
  });

  it("updates comfort request visibility and records an audit event", async () => {
    const update = vi.fn().mockResolvedValue({ id: "request_1", status: "VISIBLE" });
    const create = vi.fn().mockResolvedValue({ id: "event_1" });
    transaction.mockImplementationOnce((callback) =>
      callback({
        comfortRequest: { update },
        comfortReply: { update: vi.fn() },
        moderationEvent: { create }
      })
    );

    await expect(
      reviewComfortContentVisibility({
        targetType: ModerationTargetType.COMFORT_REQUEST,
        targetId: "request_1",
        moderatorId: "mod_1",
        status: VisibilityState.VISIBLE,
        reason: "approved"
      })
    ).resolves.toEqual([{ id: "request_1", status: "VISIBLE" }, { id: "event_1" }]);

    expect(update).toHaveBeenCalledWith({
      where: { id: "request_1" },
      data: { status: VisibilityState.VISIBLE }
    });
  });

  it("reuses an existing report for the same reporter and comfort target", async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: "user_1", sanctionState: "NORMAL" });
    const existingReport = {
      id: "report_1",
      reporterUserId: "user_1",
      targetType: ModerationTargetType.COMFORT_REQUEST,
      targetId: "request_1"
    };
    const findFirst = vi.fn().mockResolvedValue(existingReport);
    const createReport = vi.fn();
    const createEvent = vi.fn();
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { findFirst, create: createReport },
        moderationEvent: { create: createEvent }
      })
    );

    await expect(recordReport("user_1", ModerationTargetType.COMFORT_REQUEST, "request_1", "reason")).resolves.toBe(
      existingReport
    );
    expect(createReport).not.toHaveBeenCalled();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("reviews reports with accepted or dismissed audit events", async () => {
    const report = {
      id: "report_1",
      reporterUserId: "user_1",
      targetType: ModerationTargetType.COMFORT_REPLY,
      targetId: "reply_1"
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue({ ...report, status: ReportStatus.DISMISSED });
    const create = vi.fn().mockResolvedValue({ id: "event_1" });
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { updateMany, findUniqueOrThrow },
        moderationEvent: { create }
      })
    );

    await reviewReport({
      reportId: "report_1",
      moderatorId: "mod_1",
      status: ReportStatus.DISMISSED,
      reason: "not actionable"
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "report_1", status: ReportStatus.OPEN },
      data: { status: ReportStatus.DISMISSED }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "mod_1",
        targetType: ModerationTargetType.COMFORT_REPLY,
        targetId: "reply_1",
        eventType: "REPORT_DISMISSED"
      })
    });
  });
});
