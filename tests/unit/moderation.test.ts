import { VisibilityState } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const transaction = vi.hoisted(() => vi.fn());
const userFindUniqueOrThrow = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: transaction,
    user: { findUniqueOrThrow: userFindUniqueOrThrow }
  }
}));

import { calculateSanctionState, moderateText, recordReport, reviewCommentVisibility, reviewReport } from "@/server/moderation";

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
    userFindUniqueOrThrow.mockReset();
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

  it("reuses an existing report for the same reporter and target", async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: "user_1", sanctionState: "NORMAL" });
    const existingReport = { id: "report_1", reporterUserId: "user_1", targetType: "POST", targetId: "post_1" };
    const findFirst = vi.fn().mockResolvedValue(existingReport);
    const createReport = vi.fn();
    const createEvent = vi.fn();
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { findFirst, create: createReport },
        moderationEvent: { create: createEvent }
      })
    );

    await expect(recordReport("user_1", "POST", "post_1", "reason")).resolves.toBe(existingReport);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        reporterUserId: "user_1",
        targetType: "POST",
        targetId: "post_1"
      }
    });
    expect(createReport).not.toHaveBeenCalled();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("blocks write-restricted users from creating reports", async () => {
    userFindUniqueOrThrow.mockResolvedValue({ id: "user_1", sanctionState: "SHADOW_BANNED" });

    await expect(recordReport("user_1", "POST", "post_1", "reason")).rejects.toThrow("WRITE_BLOCKED");

    expect(transaction).not.toHaveBeenCalled();
  });

  it("reviews reports with accepted or dismissed audit events", async () => {
    const report = { id: "report_1", reporterUserId: "user_1", targetType: "COMMENT", targetId: "comment_1" };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue({ ...report, status: "DISMISSED" });
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
      status: "DISMISSED",
      reason: "not actionable"
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "report_1", status: "OPEN" },
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

  it("applies one trust penalty to a comment author when accepting an open report", async () => {
    const report = {
      id: "report_1",
      reporterUserId: "reporter_1",
      targetType: "COMMENT",
      targetId: "comment_1",
      status: "OPEN"
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue({ ...report, status: "REVIEWED" });
    const findComment = vi.fn().mockResolvedValue({ authorUserId: "author_1" });
    const findUser = vi.fn().mockResolvedValue({ id: "author_1", trustScore: 75 });
    const updateUser = vi.fn().mockResolvedValue({ id: "author_1", trustScore: 65, sanctionState: "NORMAL" });
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "event_reviewed" })
      .mockResolvedValueOnce({ id: "event_trust" });
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { updateMany, findUniqueOrThrow },
        praiseComment: { findUnique: findComment },
        user: { findUniqueOrThrow: findUser, update: updateUser },
        moderationEvent: { create }
      })
    );

    await reviewReport({
      reportId: "report_1",
      moderatorId: "mod_1",
      status: "REVIEWED",
      reason: "actionable abuse"
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "report_1", status: "OPEN" },
      data: { status: "REVIEWED" }
    });
    expect(findComment).toHaveBeenCalledWith({
      where: { id: "comment_1" },
      select: { authorUserId: true }
    });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "author_1" },
      data: { trustScore: 65, sanctionState: "NORMAL" }
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        userId: "author_1",
        targetType: "USER",
        targetId: "author_1",
        eventType: "TRUST_SCORE_CHANGED",
        riskReason: "accepted_actionable_report",
        trustScoreDelta: -10
      })
    });
  });

  it("does not apply trust effects when a report was already reviewed", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "report_1",
      reporterUserId: "reporter_1",
      targetType: "POST",
      targetId: "post_1",
      status: "REVIEWED"
    });
    const create = vi.fn();
    const updateUser = vi.fn();
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { updateMany, findUniqueOrThrow },
        user: { update: updateUser },
        moderationEvent: { create }
      })
    );

    await expect(
      reviewReport({
        reportId: "report_1",
        moderatorId: "mod_1",
        status: "REVIEWED",
        reason: "duplicate click"
      })
    ).resolves.toEqual([
      {
        id: "report_1",
        reporterUserId: "reporter_1",
        targetType: "POST",
        targetId: "post_1",
        status: "REVIEWED"
      },
      null
    ]);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "report_1", status: "OPEN" },
      data: { status: "REVIEWED" }
    });
    expect(create).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("reviews a missing user target without applying a target penalty", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "report_1",
      reporterUserId: "reporter_1",
      targetType: "USER",
      targetId: "missing_user",
      status: "REVIEWED"
    });
    const findUser = vi.fn().mockResolvedValue(null);
    const updateUser = vi.fn();
    const create = vi.fn().mockResolvedValue({ id: "event_reviewed" });
    transaction.mockImplementationOnce((callback) =>
      callback({
        report: { updateMany, findUniqueOrThrow },
        user: { findUnique: findUser, update: updateUser },
        moderationEvent: { create }
      })
    );

    await reviewReport({
      reportId: "report_1",
      moderatorId: "mod_1",
      status: "REVIEWED",
      reason: "missing target"
    });

    expect(findUser).toHaveBeenCalledWith({
      where: { id: "missing_user" },
      select: { id: true }
    });
    expect(updateUser).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
