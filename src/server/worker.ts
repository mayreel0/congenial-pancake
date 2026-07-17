import { loadEnvConfig } from "@next/env";
import { logWorkerPreflightWarnings } from "@/server/worker-health";

loadEnvConfig(process.cwd());
logWorkerPreflightWarnings();

async function main() {
  const { startAiPraiseWorker, startRankingWorker } = await import("@/server/jobs");
  const workers = [startAiPraiseWorker(), startRankingWorker()];
  let isShuttingDown = false;

  console.log("AI praise and ranking workers started");

  async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
      await Promise.all(workers.map((worker) => worker.close()));
      process.exit(0);
    } catch (error) {
      console.error("Failed to stop AI praise worker", error);
      process.exit(1);
    }
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main();
