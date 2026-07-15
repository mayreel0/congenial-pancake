import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyTrustDelta, reviewCommentVisibility, reviewReport } from "@/server/moderation";
import { requireUser } from "@/server/permissions";

const trustDeltaSchema = z.object({
  action: z.literal("applyTrustDelta").optional(),
  userId: z.string().min(1),
  delta: z.number().int().min(-100).max(100),
  reason: z.string().trim().min(1).max(500)
});

const commentVisibilityReviewSchema = z.object({
  action: z.literal("reviewCommentVisibility"),
  commentId: z.string().min(1),
  visibilityState: z.enum(["VISIBLE", "HIDDEN", "AUTHOR_ONLY"]),
  reason: z.string().trim().min(1).max(500)
});

const reportReviewSchema = z.object({
  action: z.literal("reviewReport"),
  reportId: z.string().min(1),
  status: z.enum(["REVIEWED", "DISMISSED"]),
  reason: z.string().trim().min(1).max(500)
});

const moderationActionSchema = z.union([trustDeltaSchema, commentVisibilityReviewSchema, reportReviewSchema]);

async function requireModerator() {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isModerator) throw new Error("MODERATOR_REQUIRED");
  return userId;
}

export async function GET() {
  await requireModerator();
  const [reports, heldComments] = await Promise.all([
    db.report.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.praiseComment.findMany({
      where: { visibilityState: { in: ["HELD", "AUTHOR_ONLY", "HIDDEN"] } },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);
  return NextResponse.json({ reports, heldComments });
}

export async function POST(request: Request) {
  const moderatorId = await requireModerator();
  const parsed = moderationActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "MODERATION_ACTION_INVALID" }, { status: 400 });
  }

  const input = parsed.data;
  if (input.action === "reviewCommentVisibility") {
    const [comment, event] = await reviewCommentVisibility({
      commentId: input.commentId,
      moderatorId,
      visibilityState: input.visibilityState,
      reason: input.reason
    });
    return NextResponse.json({ comment, event });
  }

  if (input.action === "reviewReport") {
    const [report, event] = await reviewReport({
      reportId: input.reportId,
      moderatorId,
      status: input.status,
      reason: input.reason
    });
    return NextResponse.json({ report, event });
  }

  const [user, event] = await applyTrustDelta(input.userId, input.delta, input.reason);
  return NextResponse.json({ user, event });
}
