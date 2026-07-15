import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAiControlSetting, getTodayAiUsage, updateAiControlSetting } from "@/server/ai-controls";
import { requireUser } from "@/server/permissions";

const aiControlSettingSchema = z.object({
  enabled: z.boolean().optional(),
  dailyJobLimit: z.number().int().min(0).max(10000).optional(),
  dailyCommentLimit: z.number().int().min(0).max(10000).optional()
});

async function requireModerator() {
  const session = await auth();
  const userId = requireUser(session?.user?.id);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.isModerator) throw new Error("MODERATOR_REQUIRED");
}

export async function GET() {
  await requireModerator();
  const [setting, usage] = await Promise.all([getAiControlSetting(), getTodayAiUsage()]);
  return NextResponse.json({ setting, usage });
}

export async function PATCH(request: Request) {
  await requireModerator();
  const parsed = aiControlSettingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "AI_CONTROL_INPUT_INVALID" }, { status: 400 });
  }

  try {
    const [setting, usage] = await Promise.all([updateAiControlSetting(parsed.data), getTodayAiUsage()]);
    return NextResponse.json({ setting, usage });
  } catch (error) {
    if (error instanceof Error && (error.message === "AI_LIMIT_INVALID" || error.message === "AI_ENABLED_INVALID")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
