-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('NICKNAME', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "VisibilityState" AS ENUM ('VISIBLE', 'HELD', 'HIDDEN', 'AUTHOR_ONLY');

-- CreateEnum
CREATE TYPE "SanctionState" AS ENUM ('NORMAL', 'LOW_TRUST', 'SHADOW_BANNED', 'SERVICE_BANNED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('THANK_YOU', 'HELPED_ME', 'MOVED_ME');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('POST', 'COMMENT', 'REPLY', 'USER');

-- CreateEnum
CREATE TYPE "ModerationEventType" AS ENUM ('FILTER_HELD', 'FILTER_HIDDEN', 'REPORT_CREATED', 'REPORT_ACCEPTED', 'REPORT_DISMISSED', 'TRUST_SCORE_CHANGED', 'SANCTION_CHANGED');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('INITIAL_PRAISE', 'INACTIVITY_PRAISE');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "RankingType" AS ENUM ('WARM_PRAISER', 'NEEDS_ENCOURAGEMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "nickname" TEXT NOT NULL,
    "passwordHash" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    "sanctionState" "SanctionState" NOT NULL DEFAULT 'NORMAL',
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PraisePost" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "displayMode" "DisplayMode" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "promptAnswers" JSONB,
    "status" "VisibilityState" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PraisePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PraiseComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "displayMode" "DisplayMode" NOT NULL DEFAULT 'NICKNAME',
    "body" TEXT NOT NULL,
    "visibilityState" "VisibilityState" NOT NULL DEFAULT 'VISIBLE',
    "moderationRisk" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PraiseComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibilityState" "VisibilityState" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "eventType" "ModerationEventType" NOT NULL,
    "riskReason" TEXT NOT NULL,
    "trustScoreDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPraiseJob" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "jobType" "AiJobType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "resultCommentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPraiseJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "rankingType" "RankingType" NOT NULL,
    "period" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "PraisePost_createdAt_idx" ON "PraisePost"("createdAt");

-- CreateIndex
CREATE INDEX "PraisePost_status_idx" ON "PraisePost"("status");

-- CreateIndex
CREATE INDEX "PraiseComment_postId_createdAt_idx" ON "PraiseComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PraiseComment_authorUserId_idx" ON "PraiseComment"("authorUserId");

-- CreateIndex
CREATE INDEX "PraiseComment_visibilityState_idx" ON "PraiseComment"("visibilityState");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_commentId_authorUserId_type_key" ON "Reaction"("commentId", "authorUserId", "type");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ModerationEvent_userId_createdAt_idx" ON "ModerationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationEvent_targetType_targetId_idx" ON "ModerationEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiPraiseJob_status_scheduledAt_idx" ON "AiPraiseJob"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSnapshot_rankingType_period_key" ON "RankingSnapshot"("rankingType", "period");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PraisePost" ADD CONSTRAINT "PraisePost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PraiseComment" ADD CONSTRAINT "PraiseComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PraisePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PraiseComment" ADD CONSTRAINT "PraiseComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PraisePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PraiseComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PraisePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PraiseComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPraiseJob" ADD CONSTRAINT "AiPraiseJob_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PraisePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
