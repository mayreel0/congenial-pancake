-- The legacy praise-domain records are development-only and intentionally discarded.
DELETE FROM "Report";
DELETE FROM "ModerationEvent";

DROP TABLE "Notification";
DROP TABLE "Reaction";
DROP TABLE "Reply";
DROP TABLE "PraiseComment";
DROP TABLE "AiPraiseJob";
DROP TABLE "PraisePost";
DROP TABLE "RankingSnapshot";

DROP TYPE "ReactionType";
DROP TYPE "AiJobType";
DROP TYPE "AiJobStatus";
DROP TYPE "RankingType";
DROP TYPE "NotificationType";

ALTER TYPE "ModerationTargetType" RENAME TO "ModerationTargetType_old";
CREATE TYPE "ModerationTargetType" AS ENUM ('COMFORT_REQUEST', 'COMFORT_REPLY', 'AI_REPLY_SUGGESTION', 'USER');
ALTER TABLE "Report" ALTER COLUMN "targetType" TYPE "ModerationTargetType" USING ("targetType"::text::"ModerationTargetType");
ALTER TABLE "ModerationEvent" ALTER COLUMN "targetType" TYPE "ModerationTargetType" USING ("targetType"::text::"ModerationTargetType");
DROP TYPE "ModerationTargetType_old";

CREATE TYPE "NotificationType" AS ENUM ('FIRST_REPLY_ON_REQUEST', 'REPLY_ON_REQUEST');
CREATE TYPE "QualityTargetType" AS ENUM ('COMFORT_REQUEST', 'COMFORT_REPLY', 'AI_REPLY_SUGGESTION');
CREATE TYPE "QualityLabel" AS ENUM ('SUPPORTIVE', 'LOW_EFFORT', 'SARCASTIC', 'BACKHANDED', 'DISMISSIVE', 'ADVICE_PUSHING', 'SELF_CENTERED', 'UNSAFE', 'SPAM', 'ALLOWED');
CREATE TYPE "AiSuggestionStatus" AS ENUM ('CANDIDATE', 'SHOWN', 'DISMISSED', 'ADOPTED', 'REJECTED');

CREATE TABLE "ComfortRequest" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "displayMode" "DisplayMode" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "VisibilityState" NOT NULL DEFAULT 'VISIBLE',
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "qualityLabel" "QualityLabel" NOT NULL DEFAULT 'ALLOWED',
    "firstRepliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComfortRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComfortReply" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "displayMode" "DisplayMode" NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "status" "VisibilityState" NOT NULL DEFAULT 'VISIBLE',
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "qualityLabel" "QualityLabel" NOT NULL DEFAULT 'ALLOWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComfortReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentQualityReview" (
    "id" TEXT NOT NULL,
    "targetType" "QualityTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" "QualityLabel" NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "modelProvider" TEXT,
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentQualityReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiReplySuggestion" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "suggestedForUserId" TEXT,
    "body" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "qualityLabel" "QualityLabel" NOT NULL DEFAULT 'ALLOWED',
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'CANDIDATE',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiReplySuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "NotificationType" NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "requestId" TEXT,
    "replyId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComfortRequest_authorUserId_createdAt_idx" ON "ComfortRequest"("authorUserId", "createdAt");
CREATE UNIQUE INDEX "ComfortRequest_authorUserId_localDate_key" ON "ComfortRequest"("authorUserId", "localDate");
CREATE INDEX "ComfortRequest_status_createdAt_idx" ON "ComfortRequest"("status", "createdAt");
CREATE INDEX "ComfortRequest_status_firstRepliedAt_createdAt_idx" ON "ComfortRequest"("status", "firstRepliedAt", "createdAt");
CREATE UNIQUE INDEX "ComfortReply_requestId_authorUserId_key" ON "ComfortReply"("requestId", "authorUserId");
CREATE INDEX "ComfortReply_requestId_createdAt_idx" ON "ComfortReply"("requestId", "createdAt");
CREATE INDEX "ComfortReply_authorUserId_createdAt_idx" ON "ComfortReply"("authorUserId", "createdAt");
CREATE INDEX "ComfortReply_status_createdAt_idx" ON "ComfortReply"("status", "createdAt");
CREATE INDEX "ContentQualityReview_targetType_targetId_idx" ON "ContentQualityReview"("targetType", "targetId");
CREATE INDEX "ContentQualityReview_label_createdAt_idx" ON "ContentQualityReview"("label", "createdAt");
CREATE INDEX "AiReplySuggestion_requestId_status_createdAt_idx" ON "AiReplySuggestion"("requestId", "status", "createdAt");
CREATE INDEX "AiReplySuggestion_suggestedForUserId_createdAt_idx" ON "AiReplySuggestion"("suggestedForUserId", "createdAt");
CREATE INDEX "Notification_recipientUserId_readAt_createdAt_idx" ON "Notification"("recipientUserId", "readAt", "createdAt");
CREATE INDEX "Notification_targetType_targetId_idx" ON "Notification"("targetType", "targetId");
CREATE INDEX "Notification_requestId_idx" ON "Notification"("requestId");
CREATE INDEX "Notification_replyId_idx" ON "Notification"("replyId");

ALTER TABLE "ComfortRequest" ADD CONSTRAINT "ComfortRequest_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComfortReply" ADD CONSTRAINT "ComfortReply_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ComfortRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComfortReply" ADD CONSTRAINT "ComfortReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiReplySuggestion" ADD CONSTRAINT "AiReplySuggestion_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ComfortRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiReplySuggestion" ADD CONSTRAINT "AiReplySuggestion_suggestedForUserId_fkey" FOREIGN KEY ("suggestedForUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ComfortRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ComfortReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
