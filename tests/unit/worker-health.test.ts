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

  it("does not require Redis or provider credentials for the comfort MVP diagnostic worker", () => {
    expect(getWorkerPreflightWarnings({ AI_PROVIDER: "gemini" })).toEqual([]);
  });

  it("warns when Redis is configured but unused by the comfort MVP worker", () => {
    expect(getWorkerPreflightWarnings({ REDIS_URL: "redis://localhost:6379" })).toEqual([
      "REDIS_URL is set, but the comfort MVP worker does not start Redis-backed AI praise queues."
    ]);
  });

  it("records a persisted heartbeat for the diagnostic worker", async () => {
    const now = new Date("2026-07-25T03:00:00.000Z");
    workerHeartbeatUpsert.mockResolvedValueOnce({ id: COMBINED_JOBS_WORKER_ID, lastSeenAt: now });

    await recordWorkerHeartbeat({ now });

    expect(workerHeartbeatUpsert).toHaveBeenCalledWith({
      where: { id: COMBINED_JOBS_WORKER_ID },
      create: {
        id: COMBINED_JOBS_WORKER_ID,
        workerName: "Comfort MVP 진단 worker",
        lastSeenAt: now
      },
      update: { lastSeenAt: now }
    });
  });

  it("summarizes recent worker activity for the moderation dashboard", async () => {
    workerHeartbeatFindUnique.mockResolvedValueOnce({
      id: COMBINED_JOBS_WORKER_ID,
      lastSeenAt: new Date("2026-07-25T03:55:00.000Z")
    });

    await expect(getWorkerHealthSummary({}, new Date("2026-07-25T04:00:00.000Z"))).resolves.toEqual({
      status: "ready",
      label: "정상",
      detail: "최근 worker 활동 확인됨",
      lastSeenAt: new Date("2026-07-25T03:55:00.000Z"),
      configWarningCount: 0
    });
  });
});
