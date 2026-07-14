import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyTrustDelta } from "@/server/moderation";
import { requireUser } from "@/server/permissions";

const trustDeltaSchema = z.object({
  userId: z.string().min(1),
  delta: z.number().int().min(-100).max(100),
  reason: z.string().trim().min(1).max(500)
});

async function requireModerator() {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isModerator) throw new Error("MODERATOR_REQUIRED");
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
  await requireModerator();
  const input = trustDeltaSchema.parse(await request.json());
  const [user, event] = await applyTrustDelta(input.userId, input.delta, input.reason);
  return NextResponse.json({ user, event });
}
