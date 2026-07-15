import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const findUniqueOrThrowMock = vi.hoisted(() => vi.fn());
const getAiControlSettingMock = vi.hoisted(() => vi.fn());
const getTodayAiUsageMock = vi.hoisted(() => vi.fn());
const updateAiControlSettingMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUniqueOrThrow: findUniqueOrThrowMock
    }
  }
}));

vi.mock("@/server/ai-controls", () => ({
  getAiControlSetting: getAiControlSettingMock,
  getTodayAiUsage: getTodayAiUsageMock,
  updateAiControlSetting: updateAiControlSettingMock
}));

describe("AI controls moderation API", () => {
  beforeEach(() => {
    vi.resetModules();
    authMock.mockReset();
    findUniqueOrThrowMock.mockReset();
    getAiControlSettingMock.mockReset();
    getTodayAiUsageMock.mockReset();
    updateAiControlSettingMock.mockReset();
  });

  it("rejects non-moderators", async () => {
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "user_1", isModerator: false });
    const { GET } = await import("@/app/api/moderation/ai-controls/route");

    await expect(GET()).rejects.toThrow("MODERATOR_REQUIRED");
  });

  it("returns settings and today's usage for moderators", async () => {
    authMock.mockResolvedValue({ user: { id: "mod_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "mod_1", isModerator: true });
    getAiControlSettingMock.mockResolvedValue({ enabled: true, dailyJobLimit: 10, dailyCommentLimit: 20 });
    getTodayAiUsageMock.mockResolvedValue({ executedJobs: 2, generatedComments: 5, skippedJobs: 1, failedJobs: 0 });
    const { GET } = await import("@/app/api/moderation/ai-controls/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      setting: { enabled: true, dailyJobLimit: 10, dailyCommentLimit: 20 },
      usage: { executedJobs: 2, generatedComments: 5, skippedJobs: 1, failedJobs: 0 }
    });
  });

  it("rejects invalid limits", async () => {
    authMock.mockResolvedValue({ user: { id: "mod_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "mod_1", isModerator: true });
    const { PATCH } = await import("@/app/api/moderation/ai-controls/route");

    const response = await PATCH(
      new Request("http://localhost/api/moderation/ai-controls", {
        method: "PATCH",
        body: JSON.stringify({ enabled: true, dailyJobLimit: 10001, dailyCommentLimit: 20 })
      })
    );

    expect(response.status).toBe(400);
    expect(updateAiControlSettingMock).not.toHaveBeenCalled();
  });

  it("updates settings for moderators", async () => {
    const setting = { enabled: false, dailyJobLimit: 0, dailyCommentLimit: 0 };
    authMock.mockResolvedValue({ user: { id: "mod_1" } });
    findUniqueOrThrowMock.mockResolvedValue({ id: "mod_1", isModerator: true });
    updateAiControlSettingMock.mockResolvedValue(setting);
    getTodayAiUsageMock.mockResolvedValue({ executedJobs: 0, generatedComments: 0, skippedJobs: 0, failedJobs: 0 });
    const { PATCH } = await import("@/app/api/moderation/ai-controls/route");

    const response = await PATCH(
      new Request("http://localhost/api/moderation/ai-controls", {
        method: "PATCH",
        body: JSON.stringify(setting)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      setting,
      usage: { executedJobs: 0, generatedComments: 0, skippedJobs: 0, failedJobs: 0 }
    });
    expect(updateAiControlSettingMock).toHaveBeenCalledWith(setting);
  });
});
