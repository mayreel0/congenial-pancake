import { loadEnvConfig } from "@next/env";
import { comfortMvpWorkerMessage, runComfortMvpWorkerHeartbeat } from "@/server/jobs";
import { logWorkerPreflightWarnings } from "@/server/worker-health";

loadEnvConfig(process.cwd());
logWorkerPreflightWarnings();

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

async function writeHeartbeat() {
  try {
    await runComfortMvpWorkerHeartbeat();
  } catch (error) {
    console.error("Failed to record worker heartbeat", error);
  }
}

async function main() {
  await writeHeartbeat();
  const heartbeatTimer = setInterval(() => {
    void writeHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
  let isShuttingDown = false;

  console.log(comfortMvpWorkerMessage);

  async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
      clearInterval(heartbeatTimer);
      process.exit(0);
    } catch (error) {
      console.error("Failed to stop comfort MVP diagnostic worker", error);
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
