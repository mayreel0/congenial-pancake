// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const userFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const comfortRequestFindMany = vi.hoisted(() => vi.fn());
const comfortReplyFindMany = vi.hoisted(() => vi.fn());
const getAiControlSetting = vi.hoisted(() => vi.fn());
const getTodayAiUsage = vi.hoisted(() => vi.fn());
const listTodayAiUsageEvents = vi.hoisted(() => vi.fn());
const listOpenReportsForModeration = vi.hoisted(() => vi.fn());
const getModerationDashboardSummary = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: userFindUniqueOrThrow },
    comfortRequest: { findMany: comfortRequestFindMany },
    comfortReply: { findMany: comfortReplyFindMany }
  }
}));
vi.mock("@/server/ai-controls", () => ({
  getAiControlSetting,
  getTodayAiUsage,
  listTodayAiUsageEvents,
  updateAiControlSetting: vi.fn()
}));
vi.mock("@/server/moderation", () => ({
  applyTrustDelta: vi.fn(),
  reviewComfortContentVisibility: vi.fn(),
  reviewReport: vi.fn()
}));
vi.mock("@/server/moderation-review", () => ({ listOpenReportsForModeration }));
vi.mock("@/server/moderation-summary", () => ({ getModerationDashboardSummary }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import ModerationPage from "@/app/moderation/page";

describe("ModerationPage", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    auth.mockReset();
    userFindUniqueOrThrow.mockReset();
    comfortRequestFindMany.mockReset();
    comfortReplyFindMany.mockReset();
    getAiControlSetting.mockReset();
    getTodayAiUsage.mockReset();
    listTodayAiUsageEvents.mockReset();
    listOpenReportsForModeration.mockReset();
    getModerationDashboardSummary.mockReset();
  });

  it("renders a top summary panel for moderator triage", async () => {
    auth.mockResolvedValue({ user: { id: "moderator_1" } });
    userFindUniqueOrThrow.mockResolvedValue({ id: "moderator_1", isModerator: true });
    getModerationDashboardSummary.mockResolvedValue({
      pendingRequestCount: 2,
      pendingReplyCount: 3,
      openReportCount: 1,
      todayAiFailureCount: 0,
      workerHealth: {
        label: "정상",
        detail: "최근 worker 활동 확인됨",
        lastSeenAt: new Date("2026-07-25T03:55:00.000Z"),
        configWarningCount: 0
      }
    });
    comfortRequestFindMany.mockResolvedValue([
      { id: "request_1", body: "검토가 필요해요", status: "HELD", qualityScore: 80, qualityLabel: "BACKHANDED" }
    ]);
    comfortReplyFindMany.mockResolvedValue([
      { id: "reply_1", body: "작성자만 보여요", status: "AUTHOR_ONLY", qualityScore: 70, qualityLabel: "DISMISSIVE" }
    ]);
    listOpenReportsForModeration.mockResolvedValue([
      {
        id: "report_1",
        reason: "나쁜 말",
        targetType: "COMFORT_REPLY",
        targetId: "reply_1",
        reporter: { nickname: "신고자", trustScore: 92, sanctionState: "NORMAL" },
        targetPreview: "이건 너무 심한 말이에요",
        targetAuthor: { id: "author_1", nickname: "작성자", trustScore: 47, sanctionState: "LOW_TRUST" },
        priorAcceptedCount: 2,
        priorDismissedCount: 1
      }
    ]);
    getAiControlSetting.mockResolvedValue({ enabled: true, dailyJobLimit: 100, dailyCommentLimit: 300 });
    getTodayAiUsage.mockResolvedValue({ executedJobs: 0, generatedComments: 0, skippedJobs: 0, failedJobs: 0 });
    listTodayAiUsageEvents.mockResolvedValue([]);

    render(await ModerationPage());

    expect(screen.getByRole("heading", { name: "오늘 처리 요약" })).toBeInTheDocument();
    expect(screen.getByText("보류 요청 2개")).toBeInTheDocument();
    expect(screen.getByText("보류 답변 3개")).toBeInTheDocument();
    expect(screen.getByText("보류된 위로 요청")).toBeInTheDocument();
    expect(screen.getByText("보류된 답변")).toBeInTheDocument();
    expect(screen.getByText("대상: 이건 너무 심한 말이에요")).toBeInTheDocument();
  });
});
