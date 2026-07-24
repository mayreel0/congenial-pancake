type WorkerEnv = Record<string, string | undefined>;

export type WorkerHealthSummary = {
  status: "ready" | "warning";
  label: string;
  detail: string;
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

export function getWorkerHealthSummary(env: WorkerEnv = process.env): WorkerHealthSummary {
  const warnings = getWorkerPreflightWarnings(env);
  if (warnings.length === 0) {
    return {
      status: "ready",
      label: "정상",
      detail: "필수 설정 확인됨"
    };
  }

  return {
    status: "warning",
    label: "주의",
    detail: `${warnings.length}개 설정 확인 필요`
  };
}

export function logWorkerPreflightWarnings(warnings = getWorkerPreflightWarnings()) {
  for (const warning of warnings) {
    console.warn(`[worker preflight] ${warning}`);
  }
}
