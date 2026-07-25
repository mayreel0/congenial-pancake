import { db } from "@/lib/db";

type WorkerEnv = Record<string, string | undefined>;

export const COMBINED_JOBS_WORKER_ID = "combined-jobs-worker";
const COMBINED_JOBS_WORKER_NAME = "AI 칭찬/랭킹 통합 worker";
const STALE_AFTER_MS = 15 * 60 * 1000;

export type WorkerHealthSummary = {
  status: "ready" | "warning" | "stale" | "unknown";
  label: string;
  detail: string;
  lastSeenAt: Date | null;
  configWarningCount: number;
};

export function getWorkerPreflightWarnings(env: WorkerEnv = process.env): string[] {
  const warnings: string[] = [];
  const provider = env.AI_PROVIDER?.toLowerCase() === "openai" ? "openai" : "gemini";

  if (!env.REDIS_URL) {
    warnings.push("REDIS_URL is not set; defaulting to redis://localhost:6379.");
  }

  if (provider === "openai" && !env.OPENAI_API_KEY) {
    warnings.push("OPENAI_API_KEY is not set; AI praise jobs will fail when provider calls run.");
  }

  if (provider === "gemini" && !env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) {
    warnings.push("GEMINI_API_KEY or GOOGLE_API_KEY is not set; AI praise jobs will fail when provider calls run.");
  }

  return warnings;
}

export async function recordWorkerHeartbeat({ now = new Date() } = {}) {
  await db.workerHeartbeat.upsert({
    where: { id: COMBINED_JOBS_WORKER_ID },
    create: {
      id: COMBINED_JOBS_WORKER_ID,
      workerName: COMBINED_JOBS_WORKER_NAME,
      lastSeenAt: now
    },
    update: { lastSeenAt: now }
  });
}

export async function getWorkerHealthSummary(env: WorkerEnv = process.env, now = new Date()): Promise<WorkerHealthSummary> {
  const warnings = getWorkerPreflightWarnings(env);
  const heartbeat = await db.workerHeartbeat.findUnique({
    where: { id: COMBINED_JOBS_WORKER_ID },
    select: { lastSeenAt: true }
  });

  if (!heartbeat) {
    return {
      status: "unknown",
      label: "미확인",
      detail: "아직 기록된 worker 활동이 없습니다",
      lastSeenAt: null,
      configWarningCount: warnings.length
    };
  }

  const lastSeenAt = heartbeat.lastSeenAt;
  if (now.getTime() - lastSeenAt.getTime() > STALE_AFTER_MS) {
    return {
      status: "stale",
      label: "지연",
      detail: "worker 활동이 15분 넘게 갱신되지 않았습니다",
      lastSeenAt,
      configWarningCount: warnings.length
    };
  }

  if (warnings.length === 0) {
    return {
      status: "ready",
      label: "정상",
      detail: "최근 worker 활동 확인됨",
      lastSeenAt,
      configWarningCount: 0
    };
  }

  return {
    status: "warning",
    label: "주의",
    detail: `${warnings.length}개 설정 확인 필요`,
    lastSeenAt,
    configWarningCount: warnings.length
  };
}

export function logWorkerPreflightWarnings(warnings = getWorkerPreflightWarnings()) {
  for (const warning of warnings) {
    console.warn(`[worker preflight] ${warning}`);
  }
}
