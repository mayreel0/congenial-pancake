import { VisibilityState } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const transaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: transaction
  }
}));

import { calculateSanctionState, moderateText, reviewCommentVisibility, reviewReport } from "@/server/moderation";

describe("moderation", () => {
  it("holds praise disguised as mockery", () => {
    const result = moderateText("와 그걸 자랑이라고 올리다니 대단하다");
    expect(result.visibilityState).toBe(VisibilityState.AUTHOR_ONLY);
    expect(result.risk).toBeGreaterThanOrEqual(70);
  });

  it("allows warm praise", () => {
    const result = moderateText("끝까지 해낸 점이 정말 멋져요");
    expect(result.visibilityState).toBe(VisibilityState.VISIBLE);
  });

  it("maps trust score to sanctions", () => {
    expect(calculateSanctionState(100)).toBe("NORMAL");
    expect(calculateSanctionState(59)).toBe("LOW_TRUST");
    expect(calculateSanctionState(29)).toBe("SHADOW_BANNED");
    expect(calculateSanctionState(9)).toBe("SERVICE_BANNED");
  });
});

describe("moderation review actions", () => {
  afterEach(() => {
    transaction.mockReset();
  });

  it("updates comment visibility and records an audit event", async () => {
    const update = vi.fn().mockResolvedValue({ id: "comment_1", visibilityState: "VISIBLE" });
    const create = vi.fn().mockResolvedValue({ id: "event_1" });
    transaction.mockImplementationOnce((callback) =>
      callback({
        praiseComment: { update },
        moderationEvent: { create }
      })
    );

    await expect(
      reviewCommentVisibility({
        commentId: "comment_1",
        moderatorId: "mod_1",
        visibilityState: VisibilityState.VISIBLE,
        reason: "warm praise"
      })
    ).resolves.toEqual([{ id: "comment_1", visibilityState: "VISIBLE" }, { id: "event_1" }]);

    expect(update).toHaveBeenCalledWith({
      where: { id: "comment_1" },
      data: { visibilityState: VisibilityState.VISIBLE }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "mod_1",
        targetType: "COMMENT",
        targetId: "comment_1",
        eventType: "VISIBILITY_CHANGED",
        riskReason: "warm praise"
      })
    });
  });

  it("reviews reports with accepted or dismissed audit events", async () => {
    const report = { id: "report_1", targetType: "COMMENT", targetId: "comment_1" };
    const update = vi.fn().mockResolvedValue({ ...report, status: "DISMISSED" });
    const create = vi.fn().mockResolvedValue({ id: "event_1" });
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { update },
        moderationEvent: { create }
      })
    );

    await reviewReport({
      reportId: "report_1",
      moderatorId: "mod_1",
      status: "DISMISSED",
      reason: "not actionable"
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "report_1" },
      data: { status: "DISMISSED" }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "mod_1",
        targetType: "COMMENT",
        targetId: "comment_1",
        eventType: "REPORT_DISMISSED",
        riskReason: "not actionable"
      })
    });
  });
});
