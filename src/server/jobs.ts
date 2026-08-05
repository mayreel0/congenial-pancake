import { recordWorkerHeartbeat } from "@/server/worker-health";

export const comfortMvpWorkerMessage = "No automatic AI praise worker runs in the comfort MVP.";

export async function runComfortMvpWorkerHeartbeat(now = new Date()) {
  await recordWorkerHeartbeat({ now });
  return { message: comfortMvpWorkerMessage, lastSeenAt: now };
}
