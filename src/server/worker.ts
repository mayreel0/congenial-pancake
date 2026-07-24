import { loadEnvConfig } from "@next/env";
import { logWorkerPreflightWarnings, recordWorkerHeartbeat } from "@/server/worker-health";

loadEnvConfig(process.cwd());
logWorkerPreflightWarnings();

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

async function writeHeartbeat() {
  try {
    await recordWorkerHeartbeat();
  } catch (error) {
    console.error("Failed to record worker heartbeat", error);
  }
}

async function main() {
  const { startAiPraiseWorker, startRankingWorker } = await import("@/server/jobs");
  const workers = [startAiPraiseWorker(), startRankingWorker()];
  await writeHeartbeat();
  const heartbeatTimer = setInterval(() => {
    void writeHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
  let isShuttingDown = false;

  console.log("AI praise and ranking workers started");

  async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
      clearInterval(heartbeatTimer);
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
