import { afterEach, describe, expect, it, vi } from "vitest";

const workerHeartbeatFindUnique = vi.hoisted(() => vi.fn());
const workerHeartbeatUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    workerHeartbeat: {
      findUnique: workerHeartbeatFindUnique,
      upsert: workerHeartbeatUpsert
    }
  }
}));

import {
  COMBINED_JOBS_WORKER_ID,
  getWorkerHealthSummary,
  getWorkerPreflightWarnings,
  recordWorkerHeartbeat
} from "@/server/worker-health";

describe("worker preflight warnings", () => {
  afterEach(() => {
    workerHeartbeatFindUnique.mockReset();
    workerHeartbeatUpsert.mockReset();
  });

  it("warns when Redis and provider credentials are missing", () => {
    expect(getWorkerPreflightWarnings({ AI_PROVIDER: "gemini" })).toEqual([
      "REDIS_URL is not set; defaulting to redis://localhost:6379.",
      "GEMINI_API_KEY or GOOGLE_API_KEY is not set; AI praise jobs will fail when provider calls run."
    ]);
  });

  it("checks OpenAI credentials when OpenAI provider is selected", () => {
    expect(
      getWorkerPreflightWarnings({
        AI_PROVIDER: "openai",
        REDIS_URL: "redis://localhost:6379"
      })
    ).toEqual(["OPENAI_API_KEY is not set; AI praise jobs will fail when provider calls run."]);
  });

  it("records a persisted heartbeat for the combined jobs worker", async () => {
    const now = new Date("2026-07-25T03:00:00.000Z");
    workerHeartbeatUpsert.mockResolvedValueOnce({ id: COMBINED_JOBS_WORKER_ID, lastSeenAt: now });

    await recordWorkerHeartbeat({ now });

    expect(workerHeartbeatUpsert).toHaveBeenCalledWith({
      where: { id: COMBINED_JOBS_WORKER_ID },
      create: {
        id: COMBINED_JOBS_WORKER_ID,
        workerName: "AI 칭찬/랭킹 통합 worker",
        lastSeenAt: now
      },
      update: { lastSeenAt: now }
    });
  });

  it("summarizes recent worker activity and preflight status for the moderation dashboard", async () => {
    workerHeartbeatFindUnique.mockResolvedValueOnce({
      id: COMBINED_JOBS_WORKER_ID,
      lastSeenAt: new Date("2026-07-25T03:55:00.000Z")
    });

    await expect(
      getWorkerHealthSummary({
        AI_PROVIDER: "gemini",
        REDIS_URL: "redis://localhost:6379",
        GEMINI_API_KEY: "gemini-key"
      }, new Date("2026-07-25T04:00:00.000Z"))
    ).resolves.toEqual({
      status: "ready",
      label: "정상",
      detail: "최근 worker 활동 확인됨",
      lastSeenAt: new Date("2026-07-25T03:55:00.000Z"),
      configWarningCount: 0
    });

    workerHeartbeatFindUnique.mockResolvedValueOnce({
      id: COMBINED_JOBS_WORKER_ID,
      lastSeenAt: new Date("2026-07-25T03:58:00.000Z")
    });

    await expect(getWorkerHealthSummary({ AI_PROVIDER: "gemini" }, new Date("2026-07-25T04:00:00.000Z"))).resolves.toMatchObject({
      status: "warning",
      label: "주의",
      detail: "2개 설정 확인 필요",
      configWarningCount: 2
    });
  });

  it("marks the worker unknown or stale when recent heartbeats are missing", async () => {
    workerHeartbeatFindUnique.mockResolvedValueOnce(null);

    await expect(
      getWorkerHealthSummary(
        { AI_PROVIDER: "gemini", REDIS_URL: "redis://localhost:6379", GEMINI_API_KEY: "gemini-key" },
        new Date("2026-07-25T04:00:00.000Z")
      )
    ).resolves.toMatchObject({
      status: "unknown",
      label: "미확인",
      detail: "아직 기록된 worker 활동이 없습니다",
      lastSeenAt: null,
      configWarningCount: 0
    });

    workerHeartbeatFindUnique.mockResolvedValueOnce({
      id: COMBINED_JOBS_WORKER_ID,
      lastSeenAt: new Date("2026-07-25T03:40:00.000Z")
    });

    await expect(
      getWorkerHealthSummary(
        { AI_PROVIDER: "gemini", REDIS_URL: "redis://localhost:6379", GEMINI_API_KEY: "gemini-key" },
        new Date("2026-07-25T04:00:00.000Z")
      )
    ).resolves.toMatchObject({
      status: "stale",
      label: "지연",
      detail: "worker 활동이 15분 넘게 갱신되지 않았습니다",
      lastSeenAt: new Date("2026-07-25T03:40:00.000Z"),
      configWarningCount: 0
    });
  });
});
