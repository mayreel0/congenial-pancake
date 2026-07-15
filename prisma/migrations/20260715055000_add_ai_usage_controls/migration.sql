-- CreateEnum
CREATE TYPE "AiUsageEventStatus" AS ENUM ('RUN', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "AiControlSetting" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyJobLimit" INTEGER NOT NULL DEFAULT 100,
    "dailyCommentLimit" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiControlSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "postId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiUsageEventStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedComments" INTEGER NOT NULL,
    "generatedComments" INTEGER NOT NULL,
    "estimatedPromptTokens" INTEGER NOT NULL,
    "estimatedResponseTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_createdAt_idx" ON "AiUsageEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_status_createdAt_idx" ON "AiUsageEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_jobId_idx" ON "AiUsageEvent"("jobId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_postId_idx" ON "AiUsageEvent"("postId");
