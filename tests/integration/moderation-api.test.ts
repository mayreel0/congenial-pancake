import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const findUniqueOrThrowMock = vi.hoisted(() => vi.fn());
const applyTrustDeltaMock = vi.hoisted(() => vi.fn());
const reviewComfortContentVisibilityMock = vi.hoisted(() => vi.fn());
const reviewReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: findUniqueOrThrowMock }
  }
}));

vi.mock("@/server/moderation", () => ({
  applyTrustDelta: applyTrustDeltaMock,
  reviewComfortContentVisibility: reviewComfortContentVisibilityMock,
  reviewReport: reviewReportMock
}));

describe("moderation API actions", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    findUniqueOrThrowMock.mockReset();
    applyTrustDeltaMock.mockReset();
    reviewComfortContentVisibilityMock.mockReset();
    reviewReportMock.mockReset();
  });

  it("rejects non-moderators", async () => {
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "user_1", isModerator: false });
    const { POST } = await import("@/app/api/moderation/route");

    await expect(
      POST(
        new Request("http://localhost/api/moderation", {
          method: "POST",
          body: JSON.stringify({ action: "reviewReport", reportId: "report_1", status: "DISMISSED", reason: "done" })
        })
      )
    ).rejects.toThrow("MODERATOR_REQUIRED");
  });

  it("routes comfort visibility reviews to the moderation domain", async () => {
    authMock.mockResolvedValue({ user: { id: "mod_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "mod_1", isModerator: true });
    reviewComfortContentVisibilityMock.mockResolvedValue([{ id: "request_1" }, { id: "event_1" }]);
    const { POST } = await import("@/app/api/moderation/route");

    const response = await POST(
      new Request("http://localhost/api/moderation", {
        method: "POST",
        body: JSON.stringify({
          action: "reviewComfortContentVisibility",
          targetType: "COMFORT_REQUEST",
          targetId: "request_1",
          status: "VISIBLE",
          reason: "approved"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(reviewComfortContentVisibilityMock).toHaveBeenCalledWith({
      targetType: "COMFORT_REQUEST",
      targetId: "request_1",
      moderatorId: "mod_1",
      status: "VISIBLE",
      reason: "approved"
    });
  });

  it("routes report reviews to the moderation domain", async () => {
    authMock.mockResolvedValue({ user: { id: "mod_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "mod_1", isModerator: true });
    reviewReportMock.mockResolvedValue([{ id: "report_1" }, { id: "event_1" }]);
    const { POST } = await import("@/app/api/moderation/route");

    const response = await POST(
      new Request("http://localhost/api/moderation", {
        method: "POST",
        body: JSON.stringify({
          action: "reviewReport",
          reportId: "report_1",
          status: "DISMISSED",
          reason: "not actionable"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(reviewReportMock).toHaveBeenCalledWith({
      reportId: "report_1",
      moderatorId: "mod_1",
      status: "DISMISSED",
      reason: "not actionable"
    });
  });

  it("rejects invalid moderation actions", async () => {
    authMock.mockResolvedValue({ user: { id: "mod_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "mod_1", isModerator: true });
    const { POST } = await import("@/app/api/moderation/route");

    const response = await POST(
      new Request("http://localhost/api/moderation", {
        method: "POST",
        body: JSON.stringify({ action: "reviewReport", reportId: "", status: "OPEN", reason: "" })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "MODERATION_ACTION_INVALID" });
  });
});
