import { startAiPraiseWorker } from "@/server/jobs";

const worker = startAiPraiseWorker();

console.log("AI praise worker started");

async function shutdown() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
