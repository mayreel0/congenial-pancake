import { startAiPraiseWorker } from "@/server/jobs";

const worker = startAiPraiseWorker();
let isShuttingDown = false;

console.log("AI praise worker started");

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    await worker.close();
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
