import { ModerationTargetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { recordReport } from "@/server/moderation";
import { requireUser } from "@/server/permissions";

const reportSchema = z.object({
  targetType: z.nativeEnum(ModerationTargetType),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(500)
});

export async function POST(request: Request) {
  const session = await auth();
  const reporterUserId = requireUser(session?.user?.id);
  const input = reportSchema.parse(await request.json());
  const report = await recordReport(reporterUserId, input.targetType, input.targetId, input.reason);
  return NextResponse.json({ report }, { status: 201 });
}
