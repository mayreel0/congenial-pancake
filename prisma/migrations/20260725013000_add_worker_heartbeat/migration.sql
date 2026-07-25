CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkerHeartbeat_lastSeenAt_idx" ON "WorkerHeartbeat"("lastSeenAt");
