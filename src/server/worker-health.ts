type WorkerEnv = Record<string, string | undefined>;

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

export function logWorkerPreflightWarnings(warnings = getWorkerPreflightWarnings()) {
  for (const warning of warnings) {
    console.warn(`[worker preflight] ${warning}`);
  }
}
