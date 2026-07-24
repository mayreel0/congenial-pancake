// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const userFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const praiseCommentFindMany = vi.hoisted(() => vi.fn());
const praiseCommentCount = vi.hoisted(() => vi.fn());
const reportFindMany = vi.hoisted(() => vi.fn());
const reportCount = vi.hoisted(() => vi.fn());
const aiUsageEventCount = vi.hoisted(() => vi.fn());
const workerHeartbeatFindUnique = vi.hoisted(() => vi.fn());
const getAiControlSetting = vi.hoisted(() => vi.fn());
const getTodayAiUsage = vi.hoisted(() => vi.fn());
const listTodayAiUsageEvents = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: userFindUniqueOrThrow },
    praiseComment: { count: praiseCommentCount, findMany: praiseCommentFindMany },
    report: { count: reportCount, findMany: reportFindMany },
    aiUsageEvent: { count: aiUsageEventCount },
    workerHeartbeat: { findUnique: workerHeartbeatFindUnique }
  }
}));
vi.mock("@/server/ai-controls", () => ({
  getAiControlSetting,
  getUtcDayRange: (now = new Date()) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  },
  getTodayAiUsage,
  listTodayAiUsageEvents,
  updateAiControlSetting: vi.fn()
}));
vi.mock("@/server/moderation", () => ({
  applyTrustDelta: vi.fn(),
  reviewCommentVisibility: vi.fn(),
  reviewReport: vi.fn()
}));
vi.mock("@/server/rankings", () => ({
  recomputeRankingSnapshots: vi.fn()
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

import ModerationPage from "@/app/moderation/page";

describe("ModerationPage", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    auth.mockReset();
    userFindUniqueOrThrow.mockReset();
    praiseCommentFindMany.mockReset();
    praiseCommentCount.mockReset();
    reportFindMany.mockReset();
    reportCount.mockReset();
    aiUsageEventCount.mockReset();
    workerHeartbeatFindUnique.mockReset();
    getAiControlSetting.mockReset();
    getTodayAiUsage.mockReset();
    listTodayAiUsageEvents.mockReset();
  });

  it("renders a top summary panel for moderator triage", async () => {
    process.env = {
      ...originalEnv,
      AI_PROVIDER: "gemini",
      REDIS_URL: "redis://localhost:6379",
      GEMINI_API_KEY: "gemini-key"
    };
    auth.mockResolvedValue({ user: { id: "moderator_1" } });
    userFindUniqueOrThrow.mockResolvedValue({ id: "moderator_1", isModerator: true });
    praiseCommentCount.mockResolvedValue(2);
    reportCount.mockResolvedValue(3);
    aiUsageEventCount.mockResolvedValue(1);
    workerHeartbeatFindUnique.mockResolvedValue({
      id: "combined-jobs-worker",
      lastSeenAt: new Date("2026-07-25T03:55:00.000Z")
    });
    praiseCommentFindMany.mockResolvedValue([
      { id: "comment_1", body: "확인이 필요해요", visibilityState: "HELD", moderationRisk: 80 },
      { id: "comment_2", body: "작성자만 보여요", visibilityState: "AUTHOR_ONLY", moderationRisk: 70 }
    ]);
    reportFindMany.mockResolvedValue([
      { id: "report_1", reason: "나쁜 말", targetType: "COMMENT", targetId: "comment_1" },
      { id: "report_2", reason: "스팸", targetType: "POST", targetId: "post_1" },
      { id: "report_3", reason: "괴롭힘", targetType: "USER", targetId: "user_2" }
    ]);
    getAiControlSetting.mockResolvedValue({ enabled: true, dailyJobLimit: 100, dailyCommentLimit: 300 });
    getTodayAiUsage.mockResolvedValue({ executedJobs: 4, generatedComments: 6, skippedJobs: 1, failedJobs: 1 });
    listTodayAiUsageEvents.mockResolvedValue([]);

    render(await ModerationPage());

    expect(screen.getByRole("heading", { name: "오늘 처리 요약" })).toBeInTheDocument();
    expect(screen.getByText("보류 댓글 2개")).toBeInTheDocument();
    expect(screen.getByText("열린 신고 3건")).toBeInTheDocument();
    expect(screen.getByText("AI 실패 1건")).toBeInTheDocument();
    expect(screen.getByText("Worker 정상")).toBeInTheDocument();
    expect(screen.getByText(/최근 활동 2026. 7. 25/)).toBeInTheDocument();
    expect(screen.getByText(/설정 경고/)).toBeInTheDocument();
  });
});
